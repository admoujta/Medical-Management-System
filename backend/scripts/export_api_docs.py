"""Export the authoritative FADAA Santé API reference from FastAPI OpenAPI."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402


HTTP_METHODS = ("get", "post", "put", "patch", "delete")
PUBLIC_PREFIXES = (
    "/api/health",
    "/api/db-check",
    "/api/public/",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/register-",
    "/api/auth/activate-",
    "/api/auth/staff-activation",
    "/api/provisioning/signup",
    "/api/webhooks/whatsapp",
)


def resolve(schema: dict[str, Any], spec: dict[str, Any]) -> dict[str, Any]:
    reference = schema.get("$ref")
    if not reference:
        return schema
    current: Any = spec
    for part in reference.removeprefix("#/ ").replace("#/", "").split("/"):
        current = current[part]
    return current


def example_for(schema: dict[str, Any], spec: dict[str, Any], depth: int = 0) -> Any:
    if depth > 5:
        return None
    schema = resolve(schema, spec)
    if "example" in schema:
        return schema["example"]
    if "default" in schema:
        return schema["default"]
    if schema.get("enum"):
        return schema["enum"][0]
    if "anyOf" in schema:
        candidates = [item for item in schema["anyOf"] if item.get("type") != "null"]
        return example_for(candidates[0], spec, depth + 1) if candidates else None
    if schema.get("type") == "array":
        return [example_for(schema.get("items", {}), spec, depth + 1)]
    if schema.get("type") == "object" or schema.get("properties"):
        return {
            key: example_for(value, spec, depth + 1)
            for key, value in schema.get("properties", {}).items()
            if value.get("readOnly") is not True
        }
    kind = schema.get("type")
    fmt = schema.get("format")
    if fmt == "date":
        return "2026-07-21"
    if fmt == "date-time":
        return "2026-07-21T10:00:00Z"
    if fmt == "email":
        return "utilisateur@example.com"
    if fmt in {"uuid", "uuid4"}:
        return "00000000-0000-4000-8000-000000000000"
    if kind == "boolean":
        return False
    if kind in {"integer", "number"}:
        return schema.get("minimum", 0)
    return "string"


def schema_name(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if schema.get("type") == "array":
        return f"liste de {schema_name(schema.get('items', {}))}"
    return schema.get("title") or schema.get("type") or "objet"


def request_fields(schema: dict[str, Any], spec: dict[str, Any], prefix: str = "", depth: int = 0) -> list[dict[str, Any]]:
    """Flatten request properties so the written reference lists every sent field."""
    if depth > 3:
        return []
    schema = resolve(schema, spec)
    if "anyOf" in schema:
        candidates = [item for item in schema["anyOf"] if item.get("type") != "null"]
        schema = resolve(candidates[0], spec) if candidates else schema
    required = set(schema.get("required", []))
    rows: list[dict[str, Any]] = []
    for name, raw_property in schema.get("properties", {}).items():
        property_schema = resolve(raw_property, spec)
        nullable = any(item.get("type") == "null" for item in raw_property.get("anyOf", []))
        if "anyOf" in raw_property:
            candidates = [item for item in raw_property["anyOf"] if item.get("type") != "null"]
            property_schema = resolve(candidates[0], spec) if candidates else property_schema
        field_name = f"{prefix}{name}"
        field_type = schema_name(raw_property)
        if nullable:
            field_type += " ou null"
        sample = example_for(raw_property, spec)
        rows.append({
            "name": field_name,
            "type": field_type,
            "format": property_schema.get("format") or raw_property.get("format"),
            "required": name in required,
            "description": property_schema.get("description") or raw_property.get("description") or "—",
            "example": sample,
        })
        if property_schema.get("type") == "object" or property_schema.get("properties"):
            rows.extend(request_fields(property_schema, spec, f"{field_name}.", depth + 1))
        elif property_schema.get("type") == "array":
            item_schema = property_schema.get("items", {})
            resolved_item = resolve(item_schema, spec)
            if resolved_item.get("type") == "object" or resolved_item.get("properties"):
                rows.extend(request_fields(item_schema, spec, f"{field_name}[].", depth + 1))
    return rows


def markdown_value(value: Any) -> str:
    if value is None:
        return "`null`"
    if isinstance(value, (dict, list)):
        rendered = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    else:
        rendered = str(value)
    return f"`{rendered.replace('|', chr(92) + '|')}`"


def is_public_route(path: str) -> bool:
    return any(path == prefix or path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


def curl_example(path: str, method: str, operation: dict[str, Any], spec: dict[str, Any]) -> list[str]:
    rendered_path = path
    query_parts: list[str] = []
    for parameter in operation.get("parameters") or []:
        sample = example_for(parameter.get("schema", {}), spec)
        value = str(sample if sample is not None else f"<{parameter['name']}>")
        if parameter.get("in") == "path":
            rendered_path = rendered_path.replace("{" + parameter["name"] + "}", value)
        elif parameter.get("in") == "query":
            query_parts.append(f"{parameter['name']}={value}")
    if query_parts:
        rendered_path += "?" + "&".join(query_parts)

    command = [f"curl -X {method} \"$BASE_URL{rendered_path}\""]
    if not is_public_route(path):
        command.append("  -H \"Authorization: Bearer $ACCESS_TOKEN\"")

    content = operation.get("requestBody", {}).get("content", {})
    if "application/json" in content:
        request_schema = content["application/json"].get("schema", {})
        body = json.dumps(example_for(request_schema, spec), ensure_ascii=False, separators=(",", ":"))
        command.append("  -H \"Content-Type: application/json\"")
        command.append(f"  --data-raw '{body}'")
    elif content:
        media_type, media = next(iter(content.items()))
        command.append(f"  -H \"Accept: application/json\"")
        fields = request_fields(media.get("schema", {}), spec)
        for field in fields:
            if "." in field["name"] or "[]" in field["name"]:
                continue
            value = field["example"]
            rendered = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value if value is not None else "").lower() if isinstance(value, bool) else str(value if value is not None else "")
            if field.get("format") == "binary":
                rendered = "@/chemin/vers/fichier.pdf"
            command.append(f"  -F \"{field['name']}={rendered}\"")
    return [line + (" \\" if index < len(command) - 1 else "") for index, line in enumerate(command)]


def render(spec: dict[str, Any]) -> str:
    operations: list[tuple[str, str, dict[str, Any]]] = []
    for path, path_item in spec["paths"].items():
        for method in HTTP_METHODS:
            if method in path_item:
                operations.append((path, method.upper(), path_item[method]))

    lines = [
        "# Référence complète des API — FADAA Santé",
        "",
        "> Document généré automatiquement depuis le schéma OpenAPI réel de FastAPI. Ne modifiez pas manuellement l’inventaire des routes.",
        "",
        "## Accès à l’API",
        "",
        "| Environnement | URL |",
        "|---|---|",
        "| Développement | `http://localhost:8001/api` |",
        "| Production | `https://<domaine-api>/api` |",
        "| Swagger interactif | `http://localhost:8001/docs` |",
        "| ReDoc | `http://localhost:8001/redoc` |",
        "| Schéma OpenAPI | `http://localhost:8001/openapi.json` |",
        "",
        "En production, HTTPS est obligatoire. Le domaine exact est fourni par la configuration de déploiement.",
        "",
        "## Authentification et isolation des cabinets",
        "",
        "Les routes protégées utilisent un jeton JWT :",
        "",
        "```http",
        "Authorization: Bearer <access_token>",
        "Content-Type: application/json",
        "```",
        "",
        "Le `tenant_id` est déduit de l’utilisateur authentifié. Un client ne doit jamais tenter de choisir le cabinet d’une ressource protégée.",
        "",
        "## Exemple de requête HTTPS",
        "",
        "```bash",
        "curl -X POST 'https://<domaine-api>/api/auth/login' \\",
        "  -H 'Content-Type: application/json' \\",
        "  -d '{\"email\":\"medecin@example.com\",\"password\":\"mot-de-passe\",\"role\":\"MEDECIN_ADMIN\"}'",
        "```",
        "",
        "## Préparer les tests avec curl",
        "",
        "```bash",
        "export BASE_URL='http://localhost:8001'",
        "export ACCESS_TOKEN='<collez_access_token_retourné_par_login>'",
        "```",
        "",
        "Les exemples générés utilisent des valeurs indicatives. Remplacez les identifiants UUID, dates, e-mails et fichiers par des valeurs existantes dans votre environnement de test.",
        "",
        f"## Inventaire ({len(operations)} opérations HTTP)",
        "",
        "| Méthode | Route | Description |",
        "|---|---|---|",
    ]
    for path, method, operation in operations:
        summary = (operation.get("summary") or operation.get("operationId") or "—").replace("|", "\\|")
        lines.append(f"| `{method}` | `{path}` | {summary} |")

    lines.extend(["", "## Détail des routes", ""])
    for path, method, operation in operations:
        lines.extend([
            f"### `{method} {path}`",
            "",
            operation.get("summary") or operation.get("operationId") or "Opération API",
            "",
        ])
        description = operation.get("description")
        if description:
            lines.extend([description, ""])
        lines.append(f"- Authentification : {'Bearer JWT requis' if operation.get('security') else 'publique ou contrôlée par la route'}")
        tags = operation.get("tags") or []
        if tags:
            lines.append(f"- Groupe : {', '.join(tags)}")

        parameters = operation.get("parameters") or []
        if parameters:
            lines.extend(["", "Paramètres :", "", "| Nom | Emplacement | Type | Obligatoire |", "|---|---|---|---|"])
            for parameter in parameters:
                parameter_schema = parameter.get("schema", {})
                lines.append(f"| `{parameter['name']}` | {parameter['in']} | {schema_name(parameter_schema)} | {'oui' if parameter.get('required') else 'non'} |")

        content = operation.get("requestBody", {}).get("content", {})
        if content:
            media_type, media = next(iter(content.items()))
            request_schema = media.get("schema", {})
            lines.extend(["", f"Corps de requête — `{media_type}` ({schema_name(request_schema)}) :", ""])
            fields = request_fields(request_schema, spec)
            if fields:
                lines.extend([
                    "| Paramètre envoyé | Type | Obligatoire | Description | Exemple |",
                    "|---|---|---|---|---|",
                ])
                for field in fields:
                    description = str(field["description"]).replace("|", "\\|").replace("\n", " ")
                    lines.append(f"| `{field['name']}` | {field['type']} | {'oui' if field['required'] else 'non'} | {description} | {markdown_value(field['example'])} |")
                lines.append("")
            if media_type == "application/json":
                lines.extend(["```json", json.dumps(example_for(request_schema, spec), ensure_ascii=False, indent=2), "```"])
            else:
                lines.append("Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.")

        lines.extend(["", "Requête de test :", "", "```bash", *curl_example(path, method, operation, spec), "```"])

        responses = operation.get("responses", {})
        lines.extend(["", "Réponses :", "", "| HTTP | Description | Schéma |", "|---|---|---|"])
        for status, response in responses.items():
            response_content = response.get("content", {})
            response_schema = next(iter(response_content.values())).get("schema", {}) if response_content else {}
            lines.append(f"| `{status}` | {response.get('description', '—')} | {schema_name(response_schema) if response_schema else '—'} |")
        lines.extend(["", "---", ""])

    lines.extend([
        "## Régénération",
        "",
        "Depuis la racine du projet :",
        "",
        "```bash",
        "python3 backend/scripts/export_api_docs.py",
        "```",
        "",
        "Cette commande met à jour `docs/api-reference.md` et `docs/openapi.json`.",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    spec = app.openapi()
    docs = PROJECT_ROOT / "docs"
    docs.mkdir(exist_ok=True)
    (docs / "openapi.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (docs / "api-reference.md").write_text(render(spec), encoding="utf-8")
    print(f"Documentation générée : {len(spec['paths'])} routes, {sum(1 for item in spec['paths'].values() for method in HTTP_METHODS if method in item)} opérations.")


if __name__ == "__main__":
    main()
