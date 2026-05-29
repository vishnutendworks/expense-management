"""One-off: probe which Gemini model accepts a vision request."""
import os
import sys

import google.generativeai as genai

def main() -> None:
    model_name = sys.argv[1] if len(sys.argv) > 1 else "gemini-2.5-flash-lite"
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("NO_KEY")
        sys.exit(1)

    genai.configure(api_key=api_key)
    with open("/app/test-assets/sample_receipt.png", "rb") as f:
        image_bytes = f.read()

    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(
        [
            'Return JSON only: {"merchant_name":"test"}',
            {"mime_type": "image/png", "data": image_bytes},
        ],
        generation_config={"temperature": 0.0, "max_output_tokens": 128},
    )
    print("OK", model_name, (resp.text or "")[:120])


if __name__ == "__main__":
    main()
