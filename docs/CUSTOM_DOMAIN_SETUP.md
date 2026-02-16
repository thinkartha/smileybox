# Custom domain setup: supportfix.ai

Use **supportfix.ai** for the frontend and **api.supportfix.ai** for the API so everything runs under your domain.

---

## Is the 403 an API call? No.

When you get:

- **GET https://supportfix.ai/** → 403 Forbidden  
- **GET https://supportfix.ai/favicon.ico** → 403 Forbidden  
- Response body: `<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>`

**That is not an API Gateway or Lambda call.** Those URLs are your **frontend** (website). The request goes:

1. Browser → **supportfix.ai** (DNS) → **CloudFront**
2. CloudFront → **S3** (your frontend bucket) to get `index.html` or `favicon.ico`
3. **S3** returns 403 Access Denied → CloudFront returns that to the browser

So the 403 comes from **S3 (or CloudFront→S3)**, not from API Gateway or Lambda. API calls would go to **https://api.supportfix.ai/...** (or whatever your API domain is).

To fix the 403 you need to fix **S3 + CloudFront** (see below). You do **not** need to change API Gateway or Lambda for this error.

**Step-by-step fix:** see **[FIX_403_SUPPORTFIX.md](./FIX_403_SUPPORTFIX.md)** (S3 bucket policy, CloudFront default root object, optional error pages).

---

## Why you see "Access Denied" (XML error)

That response usually means one of:

1. **You're opening the S3 bucket URL** instead of the **CloudFront URL**  
   S3 returns that XML when you hit the bucket directly. The site must be opened via **CloudFront** (or your custom domain that points to CloudFront).

2. **CloudFront is not using your custom domain yet**  
   You might be using the default `*.cloudfront.net` URL and something (e.g. default root object, viewer protocol policy) is misconfigured.

3. **S3 bucket blocks public access**  
   CloudFront needs access via an **Origin Access Identity (OAI)** or **Origin Access Control (OAC)**. If the bucket only allows that and you're hitting S3 directly, you get Access Denied.

**What to do:** Use **only** the CloudFront URL or your custom domain (e.g. **https://supportfix.ai**) for the app. Do not open the S3 bucket URL in the browser.

---

## Target setup

| What        | URL                     | AWS resource        |
|------------|--------------------------|---------------------|
| Frontend   | https://supportfix.ai   | CloudFront → S3     |
| API        | https://api.supportfix.ai | API Gateway (HTTP API) |

---

## 1. SSL certificates (ACM)

Create certificates for **supportfix.ai** and **api.supportfix.ai** in **us-east-1** (required for CloudFront and API Gateway):

1. AWS Console → **Certificate Manager** → **Request certificate**.
2. Request a **public** certificate.
3. Add names:
   - **supportfix.ai**
   - **www.supportfix.ai**
   - **api.supportfix.ai**
4. Use **DNS validation** and create the CNAME records in Route 53 (or your DNS) when prompted.
5. Wait until status is **Issued**. Note the **ARN** of the certificate (you’ll use it below).

---

## 2. Frontend: CloudFront + supportfix.ai

### 2.1 Fix "Access Denied" (CloudFront → S3)

- **Origin:** Your S3 bucket (frontend), **no** "Restrict bucket access" unless you use OAI/OAC (see below).
- **Default root object:** `index.html` (so `https://supportfix.ai/` serves the app).
- **Error pages (optional but recommended):**  
  For **403** and **404**, respond with **200** and return **/index.html** (for client-side routing).
- If you **restrict** S3 access to CloudFront only:
  - Use **Origin Access Control (OAC)** (recommended) or Origin Access Identity (OAI).
  - Attach a **bucket policy** on the S3 bucket that allows access only from that OAC/OAI (AWS docs: “CloudFront OAC bucket policy”).

### 2.2 Add custom domain to CloudFront

1. CloudFront → your distribution (the one used for the frontend) → **Edit**.
2. **Alternate domain names (CNAMEs):** add **supportfix.ai** and **www.supportfix.ai**.
3. **Custom SSL certificate:** select the ACM certificate you created for supportfix.ai (must be in **us-east-1**).
4. Save.

### 2.3 DNS (Route 53 or your DNS)

- **supportfix.ai** (A/ALIAS or CNAME) → your **CloudFront distribution domain** (e.g. `d1234abcd.cloudfront.net`).
- **www.supportfix.ai** (A/ALIAS or CNAME) → same CloudFront domain.

In Route 53: create A record (Alias) for **supportfix.ai** and **www.supportfix.ai** pointing to the CloudFront distribution.

---

## 3. Backend: API Gateway + api.supportfix.ai

1. **API Gateway** → Your HTTP API (supportdesk-api) → **Custom domain names** → **Create**.
2. **Domain name:** `api.supportfix.ai`.
3. **Certificate:** Select the ACM cert that includes **api.supportfix.ai** (us-east-1).
4. **Endpoint type:** Regional (or Edge if you use an edge-optimized custom domain).
5. **API mapping:** Map **default** (or a stage like `prod`) to your API and stage.
6. Note the **API Gateway domain name** (e.g. `d-xxx.execute-api.us-east-1.amazonaws.com`) or the **Target domain** shown for the custom domain.

### 3.1 DNS for API

- **api.supportfix.ai** → CNAME (or A/ALIAS) to the **API Gateway custom domain target** (the value AWS shows for the custom domain, e.g. `xxxx.execute-api.us-east-1.amazonaws.com`).

---

## 4. GitHub / deploy configuration

So that the deployed app uses **supportfix.ai** and **api.supportfix.ai**:

### 4.1 GitHub Secrets (Settings → Secrets and variables → Actions)

Add or update:

| Secret                 | Value |
|------------------------|--------|
| **FRONTEND_URL**       | `https://supportfix.ai` |
| **API_GATEWAY_URL**    | `https://api.supportfix.ai` (optional; used as fallback when building frontend) |

Existing secrets (S3, CloudFront, Lambda, DB, etc.) stay as they are.

### 4.2 Redeploy

1. **Backend (Lambda + API Gateway):**  
   Run the workflow with **lambda-only** (or **all**).  
   This sets **FRONTEND_URL** to `https://supportfix.ai` in the Lambda/API so CORS allows your frontend.

2. **Frontend (S3 + CloudFront):**  
   Run **s3-cloudfront-only** (or **all**).  
   The build will use the API URL from the stack output; if that’s not yet the custom domain, set **API_GATEWAY_URL** to `https://api.supportfix.ai` so the frontend is built with the correct API base URL.

After deploy, the frontend at **https://supportfix.ai** will call **https://api.supportfix.ai** and CORS will allow it.

---

## 5. Checklist

- [ ] ACM certificate for **supportfix.ai** (and www) and **api.supportfix.ai** in **us-east-1**, status **Issued**.
- [ ] CloudFront: alternate domain **supportfix.ai** (and www), custom SSL cert, default root object **index.html**, error pages 403/404 → 200 with **/index.html** if you use client-side routing.
- [ ] S3: either public read for the bucket (for simple setups) or OAC/OAI + bucket policy so only CloudFront can read; **do not** open the S3 URL in the browser.
- [ ] DNS: **supportfix.ai** and **www.supportfix.ai** → CloudFront; **api.supportfix.ai** → API Gateway custom domain target.
- [ ] API Gateway: custom domain **api.supportfix.ai** with the right cert and API mapping.
- [ ] GitHub: **FRONTEND_URL** = `https://supportfix.ai`; redeploy backend; redeploy frontend (with **API_GATEWAY_URL** = `https://api.supportfix.ai` if needed).
- [ ] Open **https://supportfix.ai** in the browser (not the S3 or raw CloudFront URL unless you’re testing).

Once this is done, both frontend and backend use **supportfix.ai** (and **api.supportfix.ai**), and the "Access Denied" XML should go away as long as you use the custom domain (or the correct CloudFront URL) for the site.
