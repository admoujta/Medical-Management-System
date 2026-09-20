import re
from typing import Annotated

from pydantic import BeforeValidator


def normalize_phone(value: object) -> str | None:
    """Validate and normalize Moroccan/international phone numbers to E.164."""
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    compact = re.sub(r"[\s().-]", "", raw)
    if compact.startswith("00"):
        compact = "+" + compact[2:]
    if compact.startswith("0") and len(compact) == 10:
        compact = "+212" + compact[1:]
    elif compact.startswith("212") and not compact.startswith("+"):
        compact = "+" + compact
    if not re.fullmatch(r"\+[1-9]\d{7,14}", compact):
        raise ValueError("Numéro de téléphone invalide. Exemple : 06 12 34 56 78 ou +212 6 12 34 56 78.")
    return compact


PhoneNumber = Annotated[str, BeforeValidator(normalize_phone)]
OptionalPhoneNumber = Annotated[str | None, BeforeValidator(normalize_phone)]
