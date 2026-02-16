# Add api.supportfix.ai in Route 53

You need a **Route 53 record** for **api.supportfix.ai** so that API calls (e.g. from the frontend) resolve to your API Gateway.

---

## Step 1: Create custom domain in API Gateway (if not done)

1. In AWS Console go to **API Gateway**.
2. In the left menu, click **Custom domain names** (under "Develop" for HTTP APIs).
3. Click **Create**.
4. **Domain name:** `api.supportfix.ai`
5. **Domain name configuration:**  
   - **ACM certificate:** Choose a certificate that includes **api.supportfix.ai** (must be in **us-east-1**).  
   - If you don’t have one: **Certificate Manager** → Request certificate → add **api.supportfix.ai** → DNS validation → create the validation CNAME in Route 53.
6. **API mapping (optional now):** You can add the mapping after the domain is created.
7. Click **Create domain name**.

After creation, API Gateway shows something like:

- **API Gateway domain name:** `d-xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`  
  or a **Target domain name** / **Invoke URL** for the custom domain.

Copy that **target** (the execute-api hostname or the URL they give you). You’ll use it in Route 53.

Then add the **API mapping**:  
- **Configure API mappings** → Add new mapping → **API:** your HTTP API (e.g. supportdesk-api) → **Stage:** e.g. `prod` → Save.

---

## Step 2: Create the record in Route 53

1. Go to **Route 53** → **Hosted zones**.
2. Open the hosted zone for **supportfix.ai** (not a different domain).
3. Click **Create record**.
4. **Record name:** `api`  
   (full name will be **api.supportfix.ai**).
5. **Record type:** **A** (or **CNAME** if your API Gateway target is a hostname and your hosted zone doesn’t support Alias to it).
6. **Alias:** Turn **on**.
7. **Route traffic to:**  
   - **Alias to API Gateway API** → choose the **region** (e.g. us-east-1) and the **API Gateway API** (your HTTP API and stage).  
   - If that option isn’t there: choose **Alias to another record** and enter the **API Gateway domain name** from Step 1 (e.g. `d-xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`). For A record Alias, Route 53 will resolve to the IPs of that target.
8. Click **Create records**.

If you use **CNAME** instead of A (Alias):

- **Record name:** `api`
- **Record type:** CNAME
- **Value:** the API Gateway domain name from Step 1, e.g. `d-xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`
- No Alias; CNAME can’t point to the zone apex, but **api** is a subdomain so CNAME is fine.

---

## Step 3: Check

- **DNS:** `nslookup api.supportfix.ai` or `dig api.supportfix.ai` should resolve to API Gateway.
- **Browser/Postman:** `https://api.supportfix.ai/api/health` (or your API path) should hit your API (e.g. 200 or 401), not “cannot resolve” or a wrong host.

---

## Summary

| Item | Where | What to do |
|------|--------|------------|
| Custom domain for API | API Gateway → Custom domain names | Create **api.supportfix.ai**, attach ACM cert (us-east-1), add API mapping |
| DNS record for API | Route 53 → Hosted zone **supportfix.ai** | Create record **api** (A Alias to API Gateway, or CNAME to API Gateway domain name) |

Your **supportfix.ai** hosted zone only has records you’ve created; **api** is a separate record name (subdomain), so you add it as above. After that, **api.supportfix.ai** will appear in the hosted zone.
