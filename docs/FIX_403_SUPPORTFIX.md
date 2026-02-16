# Fix 403 Access Denied on https://supportfix.ai

## Is this an API / Lambda call?

**No.** A 403 on **https://supportfix.ai/** or **https://supportfix.ai/favicon.ico** is **not** an API Gateway or Lambda request.

- **supportfix.ai** = your **frontend** (static site). The request goes: **Browser → CloudFront → S3**.
- The XML `<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>` is the **S3** error format. S3 is denying the read, so you get 403.

API calls would go to **https://api.supportfix.ai/...** (or your API domain). Those are separate; fixing 403 on the site is about **S3 + CloudFront**, not API GW or Lambda.

---

## If you already have a CloudFront-only bucket policy

If your bucket policy allows **only** CloudFront (e.g. `Principal: Service: cloudfront.amazonaws.com` and `Condition: AWS:SourceArn: arn:aws:cloudfront::...:distribution/E3F...`), that’s correct. You do **not** need to allow public read.

Then the 403 is usually because:

1. **CloudFront – Default root object** is not set.  
   For a request to `https://supportfix.ai/` (path `/`), CloudFront must ask S3 for `index.html`.  
   **CloudFront → your distribution → General → Edit → Default root object:** set to **index.html** and save.

2. **Bucket has no content.**  
   After the frontend deploy, the bucket must contain **index.html** at the root. Check in S3 that **index.html** and **\_next/** (and **favicon.ico** if you use it) exist. If not, run the frontend deploy again (s3-cloudfront-only or all).

---

## How to fix it (if you still need to change S3)

### 1. S3 bucket – allow reads

Your frontend bucket must allow CloudFront (or the public) to read objects.

**Option A – Public read (simplest)**

1. S3 → your **frontend bucket** (the one in `S3_BUCKET_NAME`) → **Permissions**.
2. **Block public access** → Edit → uncheck **Block all public access** → Save.
3. **Bucket policy** → Edit → paste (replace `YOUR_BUCKET_NAME` with the real bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

4. Save.

**Option B – CloudFront only (OAC)**

1. CloudFront → your **distribution** → **Origins** → select the S3 origin → **Edit**.
2. **Origin access** → **Origin access control settings (recommended)** → Create or select an OAC.
3. **Copy the S3 bucket policy** that CloudFront shows.
4. S3 → your bucket → **Permissions** → **Bucket policy** → paste that policy.
5. In the S3 origin, set **Restrict bucket access** = Yes.

### 2. CloudFront – default root object

1. CloudFront → your distribution → **General** → **Edit**.
2. **Default root object:** set to **index.html** (so `https://supportfix.ai/` serves the app).
3. Save.

### 3. Optional – custom error responses (for SPA routing)

1. CloudFront → your distribution → **Error pages** → **Create custom error response**.
2. For **403**: Response page path **/index.html**, HTTP response code **200**.
3. Create another for **404** with the same settings.

### 4. Confirm content in S3

After the GitHub workflow runs **Deploy to S3** (s3-cloudfront-only or all), the bucket should have:

- **index.html** at the root
- **favicon.ico** (if your app has one in `public/`)
- **_next/** and other assets

If the bucket is empty or missing **index.html**, run the frontend deploy again and check the workflow logs.

---

## Summary

| What you see | Where it comes from | What to fix |
|--------------|---------------------|-------------|
| 403 on https://supportfix.ai/ | S3 (via CloudFront) | S3 bucket policy + CloudFront default root object |
| 403 on https://supportfix.ai/favicon.ico | S3 (via CloudFront) | Same as above; ensure favicon exists in bucket |
| API errors (e.g. CORS, 4xx from API) | API Gateway / Lambda | That’s **api.supportfix.ai** – separate from this 403 |

You do **not** need to change API Gateway or Lambda to fix the 403 on **supportfix.ai**.
