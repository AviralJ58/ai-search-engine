import requests
import concurrent.futures
import random
import json
from time import time

API_URL = "http://127.0.0.1:8000/ingest-url"  # change if hosted remotely

# 10 genuine, crawlable URLs
BASE_URLS = [
    "https://developers.google.com/machine-learning",
    "https://www.andersdx.com/intel-baytrail-industrial-pc/?tab=specifications",
    "https://www.india.com/business/today-gold-silver-rate-october-17-check-18-22-24-carat-gold-prices-in-chennai-mumbai-delhi-kolkata-8136428/",
    "https://redis.io/docs/latest/develop/",
    "https://fastapi.tiangolo.com/tutorial/",
    "https://www.toyota.com/grsupra/?msockid=0381bfc1b0f8640811e6a946b14465e4",
    "https://huggingface.co/blog",
    "https://supabase.com/docs/guides",
    "https://towardsdatascience.com/",
    "https://cloud.google.com/architecture"
]

# Generate 100 URLs with random repetition
URLS = [random.choice(BASE_URLS) for _ in range(100)]

def ingest_url(url, idx):
    payload = {"url": url, "source": f"stress_test_batch_{idx}"}
    try:
        response = requests.post(API_URL, json=payload, timeout=20)
        return {
            "index": idx,
            "url": url,
            "status_code": response.status_code,
            "ok": response.ok,
            "response": response.text[:150]  # truncate to avoid huge logs
        }
    except Exception as e:
        return {"index": idx, "url": url, "error": str(e)}

def run_stress_test():
    start_time = time()
    results = []

    # Run up to 20 concurrent threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(ingest_url, url, i) for i, url in enumerate(URLS)]
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            results.append(res)
            if res.get("ok"):
                print(f"✅ {res['index']:03} | {res['url']} | {res['status_code']}")
            else:
                print(f"❌ {res['index']:03} | {res['url']} | ERROR: {res.get('error', res.get('response'))}")

    duration = round(time() - start_time, 2)

    # Compute simple metrics
    success_count = sum(1 for r in results if r.get("ok"))
    fail_count = len(results) - success_count

    print("\n📊 Stress Test Summary")
    print(f"Total Requests: {len(results)}")
    print(f"✅ Successes: {success_count}")
    print(f"❌ Failures: {fail_count}")
    print(f"⏱ Duration: {duration} seconds")

    with open("test\\stress_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\n💾 Results saved to test\\stress_test_results.json")

if __name__ == "__main__":
    run_stress_test()
