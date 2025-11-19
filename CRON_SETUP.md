# TRUSTE Pattern Ingestion Cron Setup

## 📋 Overview
This repository includes a nightly ML training pipeline that learns from user scoring data to improve TRUSTE's accuracy over time.

## 🗂️ Files Created

### 1. `/scripts/runPatternIngest.js`
Standalone entry point for the cron job. Executes the pattern ingestion pipeline.

### 2. `/backend/patternIngestor.js`
Core ML logic that:
- Aggregates last 24h of TrusteLog data
- Groups by platform (TikTok, Reddit, YouTube, etc.)
- Creates human/AI/mixed clusters per platform
- Calculates statistical centroids and writing signatures
- Updates PatternBrain clusters with incremental learning

### 3. `/render.yaml`
Render.com configuration with two services:
- **Web Service**: Your main Next.js app
- **Cron Job**: Runs daily at 2 AM UTC

### 4. `/models/PatternBrain.js`
MongoDB schema for storing learned patterns and clusters.

---

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Add TRUSTE pattern ingestion cron system"
git push origin main
```

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repo: `ca74ca/truste-platform`
4. Render will auto-detect `render.yaml` and create:
   - ✅ Web service (truste-platform)
   - ✅ Cron job (truste-pattern-ingest)

### Step 3: Set Environment Variables
In Render dashboard, set for BOTH services:
- `MONGODB_URI` - Your MongoDB connection string
- `NODE_ENV` - `production`

### Step 4: Verify Cron Job
- Check Render dashboard → Cron Jobs → `truste-pattern-ingest`
- View logs after first run (2 AM UTC)
- Manual test: Click "Trigger Job" button

---

## 🧪 Local Testing

Test the ingestion locally:
```bash
npm run ingest-patterns
```

---

## 📊 How It Works

1. **Data Collection**: Chrome extension logs scores to `/api/truste-log`
2. **Storage**: Logs saved to MongoDB `TrusteLog` collection
3. **Nightly Processing**: Cron job runs at 2 AM UTC
4. **Pattern Learning**: Aggregates data into `PatternBrain` clusters
5. **Incremental Updates**: Existing clusters updated with weighted averages

---

## 🔧 Customization

### Change Schedule
Edit `render.yaml`:
```yaml
schedule: "0 2 * * *"  # Daily at 2 AM UTC
schedule: "0 */6 * * *"  # Every 6 hours
schedule: "0 0 * * 0"  # Weekly on Sunday
```

### Change Processing Window
Edit `backend/patternIngestor.js`:
```javascript
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);  // Last 24h
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);  // Last 7 days
```

---

## 🐛 Troubleshooting

**Cron job fails?**
- Check Render logs for error messages
- Verify MongoDB connection string is set
- Ensure MongoDB allows Render's IP ranges

**No patterns created?**
- Verify TrusteLog collection has data
- Check that scores are being logged from extension
- Run manual test locally: `npm run ingest-patterns`

**Out of memory?**
- Reduce processing window (e.g., last 12h instead of 24h)
- Upgrade Render plan for more resources

---

## 📈 Future Enhancements

- [ ] Add pattern-based scoring override in extension
- [ ] Implement k-means clustering for better pattern separation
- [ ] Add confidence scoring based on sample size
- [ ] Create admin dashboard to view learned patterns
- [ ] Export patterns for offline ML training

---

## 🔐 Security Notes

- Device IDs are anonymous UUIDs (not linked to users)
- Only text signatures stored (first 120 chars)
- No PII collected or stored
- All data encrypted in transit (HTTPS)
