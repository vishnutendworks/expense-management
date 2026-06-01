"""Contract tests for POST /api/v1/ocr/parse (Gemini mocked)."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

MOCK_EXTRACTED = {
    "merchant_name": "Uber",
    "expense_date": "2026-05-27",
    "total_amount": 450.0,
    "tax_amount": 40.5,
    "currency_code": "INR",
    "ocr_confidence": 0.98,
    "tampering_detected": False,
}


@patch("app.main._gemini_extract_from_image", return_value=MOCK_EXTRACTED.copy())
def test_parse_receipt_success_contract(mock_gemini):
    response = client.post(
        "/api/v1/ocr/parse",
        files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    extracted = body["extracted_data"]
    assert extracted["merchant_name"] == "Uber"
    assert extracted["expense_date"] == "2026-05-27"
    assert extracted["total_amount"] == 450.0
    assert extracted["tax_amount"] == 40.5
    assert extracted["currency_code"] == "INR"
    assert extracted["ocr_confidence"] == 0.98
    assert extracted["tampering_detected"] is False
    mock_gemini.assert_called_once()


@patch("app.main._gemini_extract_from_image", return_value=MOCK_EXTRACTED.copy())
def test_parse_empty_upload_returns_400(mock_gemini):
    response = client.post(
        "/api/v1/ocr/parse",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400
    mock_gemini.assert_not_called()


@patch("app.main._gemini_extract_from_image", return_value=MOCK_EXTRACTED.copy())
def test_filename_tamper_flag(mock_gemini):
    response = client.post(
        "/api/v1/ocr/parse",
        files={"file": ("receipt_tamper.jpg", b"fake", "image/jpeg")},
    )
    assert response.status_code == 200
    extracted = response.json()["extracted_data"]
    assert extracted["tampering_detected"] is True
    assert extracted["ocr_confidence"] <= 0.4


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_as_float_robust():
    from app.main import _as_float
    assert _as_float("12.34.56") == 12.3456
    assert _as_float("8500..00") == 8500.0
    assert _as_float("1,234.56") == 1234.56
    assert _as_float("1.234,56") == 1234.56
    assert _as_float("123,45") == 123.45
    assert _as_float("1,234") == 1234.0
    assert _as_float("(150.00)") == -150.0
    assert _as_float("150.00-") == -150.0
    assert _as_float("-150.00") == -150.0
    assert _as_float("₹8,500.00") == 8500.0
    assert _as_float("USD 100") == 100.0
    assert _as_float(None) == 0.0
    assert _as_float("") == 0.0
    assert _as_float("abc") == 0.0
    assert _as_float(123) == 123.0
    assert _as_float(123.45) == 123.45

