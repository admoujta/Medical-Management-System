param(
    [string]$OpenApiUrl = "http://127.0.0.1:8001/openapi.json",
    [string]$OutputPath = "..\..\docs\api-requests-excel.txt"
)

$ErrorActionPreference = "Stop"
$spec = Invoke-RestMethod -Uri $OpenApiUrl -Method Get
$methods = @("get", "post", "put", "patch", "delete")

function Clean-Cell([object]$Value) {
    if ($null -eq $Value) { return "" }
    return (([string]$Value) -replace "`t", " " -replace "`r?`n", " " -replace "\s+", " ").Trim()
}

function Schema-Name([object]$Schema) {
    if ($null -eq $Schema) { return "" }
    $reference = $Schema.'$ref'
    if ($reference) { return ($reference -split "/")[-1] }
    if ($Schema.type) { return [string]$Schema.type }
    if ($Schema.anyOf) {
        return (($Schema.anyOf | ForEach-Object { Schema-Name $_ }) -join " | ")
    }
    return "object"
}

$rows = New-Object System.Collections.Generic.List[object]
foreach ($pathProperty in $spec.paths.PSObject.Properties) {
    $path = $pathProperty.Name
    $pathItem = $pathProperty.Value
    foreach ($method in $methods) {
        $operation = $pathItem.$method
        if ($null -eq $operation) { continue }

        $parameters = @()
        if ($pathItem.parameters) { $parameters += @($pathItem.parameters) }
        if ($operation.parameters) { $parameters += @($operation.parameters) }
        $pathParams = @($parameters | Where-Object { $_.in -eq "path" } | ForEach-Object {
            "$($_.name)$($(if ($_.required) {'*'} else {''})):$((Schema-Name $_.schema))"
        }) -join "; "
        $queryParams = @($parameters | Where-Object { $_.in -eq "query" } | ForEach-Object {
            "$($_.name)$($(if ($_.required) {'*'} else {''})):$((Schema-Name $_.schema))"
        }) -join "; "

        $bodyContentType = ""
        $bodySchema = ""
        $bodyRequired = "Non"
        if ($operation.requestBody) {
            $bodyRequired = if ($operation.requestBody.required) { "Oui" } else { "Non" }
            $contentProperties = @($operation.requestBody.content.PSObject.Properties)
            $bodyContentType = ($contentProperties.Name -join "; ")
            if ($contentProperties.Count -gt 0) {
                $bodySchema = Schema-Name $contentProperties[0].Value.schema
            }
        }

        $responseCodes = @($operation.responses.PSObject.Properties.Name)
        $successCodes = @($responseCodes | Where-Object { $_ -match "^2" }) -join "; "
        $errorCodes = @($responseCodes | Where-Object { $_ -notmatch "^2" }) -join "; "
        $tags = if ($operation.tags) { @($operation.tags) -join "; " } else { (($path.TrimStart("/") -split "/")[1]) }
        $auth = if ($operation.security -and @($operation.security).Count -gt 0) { "Bearer" } else { "Public" }

        $rows.Add([PSCustomObject]@{
            Methode = $method.ToUpperInvariant()
            Endpoint = $path
            Authentification = $auth
            Categorie = Clean-Cell $tags
            Resume = Clean-Cell $operation.summary
            Description = Clean-Cell $operation.description
            Parametres_Path = Clean-Cell $pathParams
            Parametres_Query = Clean-Cell $queryParams
            Corps_Requis = $bodyRequired
            Type_Contenu = Clean-Cell $bodyContentType
            Schema_Corps = Clean-Cell $bodySchema
            Succes_HTTP = Clean-Cell $successCodes
            Erreurs_HTTP = Clean-Cell $errorCodes
            Operation_ID = Clean-Cell $operation.operationId
        })
    }
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $OutputPath))
$directory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
}

$intro = @(
    "FADAA SANTE - INVENTAIRE COMPLET DES API",
    "Format : TSV (colonnes separees par tabulations), compatible Excel.",
    "Import Excel : Donnees > A partir d'un fichier texte/CSV > Delimiteur Tabulation > Encodage UTF-8.",
    "Base locale : http://127.0.0.1:8001",
    "Swagger : http://127.0.0.1:8001/docs",
    "OpenAPI : http://127.0.0.1:8001/openapi.json",
    "Les parametres marques * sont obligatoires.",
    "Nombre total d'operations : $($rows.Count)",
    ""
)

$header = ($rows[0].PSObject.Properties.Name -join "`t")
$lines = New-Object System.Collections.Generic.List[string]
foreach ($line in $intro) { $lines.Add($line) }
$lines.Add($header)
foreach ($row in $rows) {
    $lines.Add((@($row.PSObject.Properties.Value | ForEach-Object { Clean-Cell $_ }) -join "`t"))
}
[System.IO.File]::WriteAllLines($resolvedOutput, $lines, [System.Text.UTF8Encoding]::new($true))
Write-Output "Export termine : $resolvedOutput ($($rows.Count) operations)"
