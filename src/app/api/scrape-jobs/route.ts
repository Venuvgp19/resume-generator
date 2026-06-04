import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Store active scraping progress in memory
const scrapingProgress = new Map<string, ScrapingProgress>();

interface ScrapingProgress {
  id: string;
  status: 'starting' | 'browsing' | 'scrolling' | 'extracting' | 'details' | 'saving' | 'done' | 'error';
  message: string;
  progress: number; // 0-100
  jobsFound: number;
  currentJob: number;
  totalJobs: number;
  error?: string;
  jobs: any[];
}

// POST handler for starting a scrape
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Check if this is a status check request
  if (body.checkStatus && body.scrapeId) {
    const progress = scrapingProgress.get(body.scrapeId);
    if (!progress) {
      return NextResponse.json({ error: 'Scrape not found' }, { status: 404 });
    }
    return NextResponse.json(progress);
  }
  
  const { keywords, location, experience, remote, datePosted } = body;

  if (!keywords) {
    return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
  }

  const scrapeId = `scrape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Initialize progress
  const progress: ScrapingProgress = {
    id: scrapeId,
    status: 'starting',
    message: 'Initializing browser...',
    progress: 0,
    jobsFound: 0,
    currentJob: 0,
    totalJobs: 0,
    jobs: [],
  };
  scrapingProgress.set(scrapeId, progress);

  // Start scraping in background (don't await)
  scrapeJobs(scrapeId, { keywords, location, experience, remote, datePosted });

  // Return immediately with the scrape ID
  return NextResponse.json({ scrapeId, status: 'started' });
}

// Background scraping function
async function scrapeJobs(
  scrapeId: string,
  filters: { keywords: string; location: string; experience: string; remote: boolean; datePosted: string }
) {
  const { keywords, location, experience, remote, datePosted } = filters;
  const progress = scrapingProgress.get(scrapeId)!;

  const searchQuery = encodeURIComponent(keywords);
  const locQuery = location ? encodeURIComponent(location) : '';

  let experienceCode = '';
  switch (experience) {
    case 'entry': experienceCode = '2'; break;
    case 'mid': experienceCode = '3'; break;
    case 'senior': experienceCode = '4'; break;
  }

  let timeCode = '';
  switch (datePosted) {
    case 'day': timeCode = 'r86400'; break;
    case 'week': timeCode = 'r604800'; break;
    case 'month': timeCode = 'r2592000'; break;
  }

  let url = `https://www.linkedin.com/jobs/search?keywords=${searchQuery}`;
  if (locQuery) url += `&location=${locQuery}`;
  if (experienceCode) url += `&f_E=${experienceCode}`;
  if (timeCode) url += `&f_TPR=${timeCode}`;
  if (remote) url += `&f_WT=2`;

  let browser;
  try {
    // Update progress
    progress.status = 'starting';
    progress.message = 'Launching browser...';
    progress.progress = 5;
    scrapingProgress.set(scrapeId, { ...progress });

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    progress.status = 'browsing';
    progress.message = 'Navigating to LinkedIn...';
    progress.progress = 10;
    scrapingProgress.set(scrapeId, { ...progress });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
    });

    // Go to LinkedIn jobs search
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Force English locale by navigating with hl=en parameter if not present
    const currentUrl = page.url();
    if (!currentUrl.includes('hl=en')) {
      const enUrl = currentUrl.includes('?') ? `${currentUrl}&hl=en` : `${currentUrl}?hl=en`;
      await page.goto(enUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    }

    progress.status = 'scrolling';
    progress.message = 'Waiting for page to load...';
    progress.progress = 20;
    scrapingProgress.set(scrapeId, { ...progress });

    // Wait for the page to settle
    await new Promise((r) => setTimeout(r, 3000));

    // Scroll to trigger lazy loading
    progress.message = 'Scrolling to load job listings...';
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 800));
      progress.progress = 20 + (i + 1) * 6;
      scrapingProgress.set(scrapeId, { ...progress });
    }

    // Try multiple possible selectors
    const selector =
      'li[data-occludable-job-id], .jobs-search__results-list li, [class*="job-search-card"], .base-card';

    let jobs: any[] = [];
    try {
      await page.waitForSelector(selector.split(',')[0].trim(), { timeout: 15000 });
    } catch {
      await page.evaluate(() => {
        const container = document.querySelector('.jobs-search__results-list, [class*="results-list"]');
        if (container) container.scrollTop = container.scrollHeight;
      });
      await new Promise((r) => setTimeout(r, 2000));
    }

    progress.status = 'extracting';
    progress.message = 'Extracting job listings...';
    progress.progress = 50;
    scrapingProgress.set(scrapeId, { ...progress });

    jobs = await page.evaluate(() => {
      const results: any[] = [];
      let cards = document.querySelectorAll('li[data-occludable-job-id]');
      if (cards.length === 0) cards = document.querySelectorAll('.jobs-search__results-list > li');
      if (cards.length === 0) cards = document.querySelectorAll('[class*="job-search-card"]');
      if (cards.length === 0) cards = document.querySelectorAll('.base-card');

      cards.forEach((card, i) => {
        let titleEl =
          card.querySelector('h3[class*="base-search-card__title"], [class*="job-card-list__title"] a, a[class*="job-card-list__title"], .job-card-container__link span') as HTMLElement;
        if (!titleEl) {
          const links = card.querySelectorAll('a');
          for (const a of Array.from(links)) {
            if (a.textContent?.trim().length > 3) {
              titleEl = a;
              break;
            }
          }
        }

        let companyEl = card.querySelector('[class*="base-search-card__subtitle"], [class*="job-card-container__company-name"], [class*="artdeco-entity-lockup__subtitle"]') as HTMLElement;
        let locationEl = card.querySelector('[class*="job-search-card__location"], [class*="artdeco-entity-lockup__caption"]') as HTMLElement;
        let dateEl = card.querySelector('time') as HTMLElement;

        const title = titleEl?.textContent?.trim() || titleEl?.getAttribute('aria-label')?.trim() || '';
        const company = companyEl?.textContent?.trim() || '';
        const location = locationEl?.textContent?.trim() || '';
        const postedDate = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        const link = (titleEl as any)?.href || card.querySelector('a')?.getAttribute('href') || '';

        if (title && company) {
          results.push({
            id: `li_${Date.now()}_${i}`,
            title,
            company,
            location,
            postedDate,
            link: link.startsWith('http') ? link : `https://www.linkedin.com${link}`,
            description: '',
          });
        }
      });
      return results;
    });

    const MAX_DETAIL_JOBS = 15;

    progress.jobsFound = jobs.length;
    progress.status = 'details';
    progress.message = `Found ${jobs.length} jobs. Scraping details...`;
    progress.progress = 60;
    progress.totalJobs = Math.min(jobs.length, MAX_DETAIL_JOBS);
    scrapingProgress.set(scrapeId, { ...progress });

    // If still empty, dump page HTML to help debug
    if (jobs.length === 0) {
      const html = await page.content();
      console.log('LinkedIn page HTML snippet (first 2000 chars):', html.substring(0, 2000));
    }

    // Scrape descriptions for first 15 jobs
    const detailedJobs: any[] = [];
    for (let i = 0; i < Math.min(jobs.length, MAX_DETAIL_JOBS); i++) {
      const job = jobs[i];
      progress.currentJob = i + 1;
      progress.message = `Scraping job ${i + 1}/${Math.min(jobs.length, MAX_DETAIL_JOBS)}: ${job.title} at ${job.company}`;
      progress.progress = 60 + ((i + 1) / Math.min(jobs.length, MAX_DETAIL_JOBS)) * 30;
      scrapingProgress.set(scrapeId, { ...progress });

      try {
        if (job.link) {
          await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise((r) => setTimeout(r, 2000));
          const description = await page.evaluate(() => {
            const selectors = [
              '.description__text',
              '.jobs-description__content',
              '[class*="jobs-description__content"]',
              '#job-details',
              '[data-test-id="job-details"]',
            ];
            for (const s of selectors) {
              const el = document.querySelector(s);
              if (el?.textContent?.trim()) return el.textContent.trim();
            }
            return '';
          });
          job.description = description;
        }
        detailedJobs.push(job);
      } catch {
        detailedJobs.push(job);
      }
    }

    progress.status = 'saving';
    progress.message = 'Saving results...';
    progress.progress = 95;
    scrapingProgress.set(scrapeId, { ...progress });

    // Save to a JSON file
    const fs = await import('fs');
    const path = await import('path');
    const jobsDir = path.join(process.cwd(), 'jobs-data');
    if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir, { recursive: true });
    const filePath = path.join(jobsDir, `${Date.now()}_jobs.json`);
    fs.writeFileSync(filePath, JSON.stringify(detailedJobs, null, 2));

    progress.status = 'done';
    progress.message = `Done! Found ${detailedJobs.length} jobs.`;
    progress.progress = 100;
    progress.jobs = detailedJobs;
    scrapingProgress.set(scrapeId, { ...progress });

  } catch (err: any) {
    progress.status = 'error';
    progress.message = `Error: ${err.message}`;
    progress.error = err.message;
    scrapingProgress.set(scrapeId, { ...progress });
    console.error('[scrape-jobs] Error:', err);
  } finally {
    if (browser) await browser.close();
    
    // Clean up progress after 5 minutes
    setTimeout(() => {
      scrapingProgress.delete(scrapeId);
    }, 5 * 60 * 1000);
  }
}
