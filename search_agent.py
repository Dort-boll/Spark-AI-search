import time
from ddgs import DDGS
from ddgs.exceptions import DDGSException, RatelimitException, TimeoutException


class DDGSSearch:
    def __init__(self, timeout=10, retries=3):
        self.timeout = timeout
        self.retries = retries

    # ---------------------------
    # SAFE EXECUTION WITH RETRY
    # ---------------------------
    def _run(self, func):
        for attempt in range(self.retries):
            try:
                with DDGS(timeout=self.timeout) as ddgs:
                    return func(ddgs)

            except RatelimitException:
                print(f"[Retry {attempt+1}] Rate limit hit...")
                time.sleep(2)

            except TimeoutException:
                print(f"[Retry {attempt+1}] Timeout...")
                time.sleep(2)

            except DDGSException as e:
                print(f"[Error] {e}")
                break

        return []

    # ---------------------------
    # 1. WEB SEARCH (ORIGINAL LINKS)
    # ---------------------------
    def web(self, query, max_results=5):
        def search(ddgs):
            return ddgs.text(
                query=query,
                region="us-en",
                safesearch="moderate",
                max_results=max_results
            )

        results = self._run(search)

        return [
            {
                "title": r.get("title"),
                "link": r.get("href"),   # ✅ ORIGINAL LINK
                "snippet": r.get("body")
            }
            for r in results
        ]

    # ---------------------------
    # 2. IMAGE SEARCH
    # ---------------------------
    def images(self, query, max_results=5):
        def search(ddgs):
            return ddgs.images(
                query=query,
                max_results=max_results,
                safesearch="moderate"
            )

        results = self._run(search)

        return [
            {
                "title": r.get("title"),
                "image_url": r.get("image"),   # ✅ DIRECT IMAGE
                "source": r.get("url")
            }
            for r in results
        ]

    # ---------------------------
    # 3. VIDEO SEARCH
    # ---------------------------
    def videos(self, query, max_results=5):
        def search(ddgs):
            return ddgs.videos(
                query=query,
                max_results=max_results
            )

        results = self._run(search)

        return [
            {
                "title": r.get("title"),
                "video_url": r.get("content"),  # ✅ VIDEO LINK
                "duration": r.get("duration")
            }
            for r in results
        ]

    # ---------------------------
    # COMBINED SEARCH
    # ---------------------------
    def search_all(self, query):
        return {
            "query": query,
            "web": self.web(query),
            "images": self.images(query),
            "videos": self.videos(query)
        }


# ---------------------------
# TEST RUN
# ---------------------------
if __name__ == "__main__":
    search = DDGSSearch()

    query = "AI tools"

    results = search.search_all(query)

    print("\n🌐 WEB LINKS:")
    for r in results["web"]:
        print(r["title"], "->", r["link"])

    print("\n🖼️ IMAGES:")
    for r in results["images"]:
        print(r["image_url"])

    print("\n🎥 VIDEOS:")
    for r in results["videos"]:
        print(r["video_url"])
