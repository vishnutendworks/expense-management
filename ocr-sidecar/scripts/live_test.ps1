# Live OCR test against running sidecar (port 8001)
param(
    [string]$ReceiptPath = "..\test-assets\sample_receipt.png",
    [string]$BaseUrl = "http://localhost:8001"
)

$receipt = Resolve-Path $ReceiptPath
Write-Host "Uploading $receipt to $BaseUrl/api/v1/ocr/parse ..."

$form = @{
    file = Get-Item -LiteralPath $receipt
}

$response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/ocr/parse" -Method Post -Form $form
$response | ConvertTo-Json -Depth 6
