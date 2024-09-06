const express = require('express');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;

app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tsmark0085@gmail.com',
        pass: 'jpwr xqtv xwtj oorc'
    }
});

const amazonScraper = async (searchQuery) => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: '/usr/bin/google-chrome', headless: true, defaultViewport: false });
    const page = await browser.newPage();
    await page.goto("https://www.amazon.in", { timeout: 60000 });
    await page.setViewport({ width: 1920, height: 1080 });

    await page.type("#twotabsearchtextbox", searchQuery);
    await page.keyboard.press("Enter");
    await page.waitForSelector('[data-cel-widget^="search_result_"] h2');

    const amazonProducts = [];

    while (true) {
        const productsOnCurrentPage = await page.evaluate(() => {
            const productElements = Array.from(document.querySelectorAll('[data-cel-widget^="search_result_"]'));

            const products = productElements.map(element => {
                const titleElement = element.querySelector("h2");
                const priceElement = element.querySelector(".a-price-whole");
                const hrefElement = element.querySelector(".a-size-mini a");
                const imgElement = element.querySelector(".s-image");

                if (titleElement && priceElement && hrefElement && imgElement) {
                    const title = titleElement.innerText.trim();
                    const price = priceElement.innerText.trim().replace(/[^0-9.]/g, "");
                    const href = hrefElement.href;
                    const src = imgElement.src;

                    return { title, price, href, src, site: "Amazon" };
                }
            });

            return products.filter(product => product !== undefined);
        });

        amazonProducts.push(...productsOnCurrentPage);

        const nextButton = await page.$(".s-pagination-strip a:last-child");
        if (!nextButton) break;
        await nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 4000));
    }

    await browser.close();
    return amazonProducts;
};



const flipkartScraper = async (searchQuery) => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: '/usr/bin/google-chrome', headless: true, defaultViewport: null, args: ["--start-maximized"] });
    const page = await browser.newPage();
    await page.goto("https://www.flipkart.com/", { timeout: 60000 });

    try {
        await page.waitForSelector('._2KpZ6l._2doB4z', { timeout: 5000 });
        await page.click('._2KpZ6l._2doB4z');
    } catch (err) {
        // console.log("Login popup not found, continuing...");
    }

    await page.type('input[name="q"]', searchQuery);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".slAVV4, .tUxRFH", { timeout: 60000 });

    const flipkartProducts = [];

    for (let i = 0; i < 20; i++) {
        const productsOnCurrentPage = await page.evaluate(() => {
            // Combine both selectors to ensure we get all product elements
            const productElements = [
                ...document.querySelectorAll(".slAVV4"),
                ...document.querySelectorAll(".tUxRFH")
            ];

            return productElements.map(element => {
                const title = element.querySelector(".KzDlHZ")?.innerText.trim();
                const price = element.querySelector(".Nx9bqj")?.innerText.trim() ||
                    element.querySelector("._30jeq3")?.innerText.trim(); // Handle price from different classes
                const href = element.querySelector(".CGtC98")?.href;
                const src = element.querySelector("img")?.src;

                if (title && price) {
                    return { title, price, href, src, site: "Flipkart" };
                }
            }).filter(product => product !== undefined);
        });

        flipkartProducts.push(...productsOnCurrentPage);

        const nextButton = await page.$("a._9QVEpD:last-child");
        if (!nextButton) break;
        await nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await browser.close();
    return flipkartProducts;
};

const amazonScraperSinglePage = async (searchQuery) => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        executablePath: '/usr/bin/google-chrome',
        args: ['--window-size=1920,1080 --no-sandbox', '--disable - setuid - sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        // console.log('Navigating to the page...');
        await page.goto(searchQuery, { timeout: 60000, waitUntil: 'networkidle2' });
        // console.log('Page loaded');
        const isProductPage = await page.evaluate(() => {
            return !!document.getElementById('productTitle');
        });

        if (!isProductPage) {
            console.log('Not on a product page. Possibly redirected.');
            return null;
        }
        // console.log('On product page, attempting to find price...');
        const productPrice = await page.evaluate(() => {
            const productPrice1 = document.querySelector(".a-price-whole");
            return productPrice1 ? productPrice1.innerText.replace(/[^0-9.]/g, "") : null;
        });

        return productPrice.replace('.', '');
    } catch (error) {
        console.error('An error occurred:', error);
        return null;
    } finally {
        await browser.close();
    }
};

const flipkartScraperSinglePage = async (searchQuery) => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable - setuid - sandbox'], executablePath: '/usr/bin/google-chrome', headless: true, defaultViewport: false });
    const page = await browser.newPage();
    await page.goto(searchQuery, { timeout: 60000 });
    await page.setViewport({ width: 1920, height: 1080 });

    const productPriceOnCurrentPage = await page.evaluate(() => {
        const productPrice = document.querySelector(".Nx9bqj");
        return productPrice ? productPrice.innerText : null;
    });

    await browser.close();

    return productPriceOnCurrentPage;
};

const checkPricesAndNotify = async () => {
    try {
        const selectedItems = JSON.parse(fs.readFileSync("selectedItems.json", "utf8"));
        const priceDrops = [];

        for (const item of selectedItems) {
            let currentPrice;

            if (item.site === "Amazon") {
                currentPrice = await amazonScraperSinglePage(item.href.split("ref=")[0]);
            } else if (item.site === "Flipkart") {
                currentPrice = await flipkartScraperSinglePage(item.href);
            }

            if (currentPrice) {
                const newPrice = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
                const prices = item.price.split(', ').map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
                const oldPrice = prices[prices.length - 1];

                if (newPrice < oldPrice) {
                    priceDrops.push({
                        title: item.title,
                        oldPrice,
                        newPrice,
                        site: item.site,
                        url: item.href
                    });
                }

                item.price += `, ${newPrice}`;
            }
        }

        fs.writeFileSync("selectedItems.json", JSON.stringify(selectedItems, null, 2), "utf8");

        if (priceDrops.length > 0) {
            // Send email notification
            const mailOptions = {
                from: 'tsmark0085@gmail.com',
                to: 'gvssrikar1234@gmail.com',
                subject: 'Price Drop Alert!',
                html: `
          <h1>Price Drop Alert</h1>
          ${priceDrops.map(item => `
            <h2>${item.title}</h2>
            <p>Old Price: ${item.oldPrice}</p>
            <p>New Price: ${item.newPrice}</p>
            <p>Site: ${item.site}</p>
            <p><a href="${item.url}">View Product</a></p>
          `).join('<hr>')}
        `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
        }

        console.log('Price check completed:', priceDrops.length ? 'Price drops found' : 'No price drops');
    } catch (error) {
        console.error('An error occurred while checking prices:', error);
    }
};

// Schedule the price check every 12 hours
// schedule.scheduleJob('0 */12 * * *', checkPricesAndNotify);
// schedule.scheduleJob('*/5 * * * *', checkPricesAndNotify);
//=========================================================================================================
// API 1: Scrape a product and add to data.txt
app.post('/api/scrape', async (req, res) => {
    const { product } = req.body;
    if (!product) {
        return res.status(400).json({ error: 'Product name is required' });
    }

    try {
        const [amazonProducts, flipkartProducts] = await Promise.all([
            amazonScraper(product),
            flipkartScraper(product)
        ]);

        const allProducts = [...amazonProducts, ...flipkartProducts];

        let existingData = [];
        try {
            existingData = JSON.parse(fs.readFileSync("data.txt", "utf8"));
        } catch (err) {
            console.log("No existing data found, starting fresh.");
        }

        for (const product of allProducts) {
            const existingProduct = existingData.find(p => p.title === product.title);
            if (existingProduct) {
                existingProduct.price += `, ${product.price}`;
            } else {
                existingData.push(product);
            }
        }

        fs.writeFileSync("data.txt", JSON.stringify(existingData, null, 2));
        res.json({ message: 'Data saved successfully to data.txt', products: allProducts });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while scraping' });
    }
});
//===============================================================================================================
// API 2: Search for products in data.txt
app.post('/api/search', (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const data = JSON.parse(fs.readFileSync("data.txt", "utf8"));
        const results = data.filter(product => product.title.toLowerCase().includes(query.toLowerCase()));

        if (results.length === 0) {
            return res.json({ message: 'No products found' });
        }

        // Store search results temporarily
        app.locals.searchResults = results;

        res.json({
            message: 'Products found',
            products: results.map((product, index) => ({
                id: index,
                title: product.title,
                price: product.price,
                site: product.site
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while searching for products' });
    }
});
//==================================================================================================
// API 3: select products in data.txt and add to selectedItems.json
app.post('/api/select-products', (req, res) => {
    const { selectedIds } = req.body;
    if (!selectedIds || !Array.isArray(selectedIds)) {
        return res.status(400).json({ error: 'Selected product IDs are required' });
    }

    try {
        const searchResults = app.locals.searchResults;
        if (!searchResults) {
            return res.status(400).json({ error: 'No recent search results found. Please search first.' });
        }

        const selectedProducts = selectedIds
            .map(id => searchResults[id])
            .filter(product => product !== undefined);

        if (selectedProducts.length === 0) {
            return res.status(400).json({ error: 'No valid products selected' });
        }

        let selectedItems = [];
        try {
            selectedItems = JSON.parse(fs.readFileSync("selectedItems.json", "utf8"));
        } catch (err) {
            console.log("No selected items found, starting fresh.");
        }

        // Add selected products to selectedItems, avoiding duplicates
        selectedProducts.forEach(product => {
            if (!selectedItems.some(item => item.title === product.title && item.site === product.site)) {
                selectedItems.push(product);
            }
        });

        fs.writeFileSync("selectedItems.json", JSON.stringify(selectedItems, null, 2));

        res.json({
            message: 'Products added to selectedItems.json',
            addedProducts: selectedProducts
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while selecting and adding products' });
    }
});
//======================================================================================================================
// API 4: Check price drop in selectedItems.json
app.get('/api/check-price', async (req, res) => {
    try {
        await checkPricesAndNotify();
        res.json({ message: 'Price check completed' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while checking prices' });
    }
});
//=============================================================================================================
// API 5: Display items in selectedItems.json
app.get('/api/selected-items', (req, res) => {
    try {
        const selectedItems = JSON.parse(fs.readFileSync("selectedItems.json", "utf8"));
        res.json({ selectedItems });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching selected items' });
    }
});
//=================================================================================================================
// API 6: Remove products from cart
app.post('/api/remove-products', (req, res) => {
    const { indices } = req.body;
    if (!indices || !Array.isArray(indices)) {
        return res.status(400).json({ error: 'Invalid indices provided' });
    }

    try {
        let selectedItems = JSON.parse(fs.readFileSync("selectedItems.json", "utf8"));
        const validIndices = indices.filter(index => index >= 0 && index < selectedItems.length);

        if (validIndices.length > 0) {
            validIndices.sort((a, b) => b - a);
            const removedProducts = validIndices.map(index => selectedItems.splice(index, 1)[0]);
            fs.writeFileSync("selectedItems.json", JSON.stringify(selectedItems, null, 2));
            res.json({ message: 'Products removed successfully', removedProducts });
        } else {
            res.status(400).json({ error: 'No valid indices provided' });
        }
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while removing products' });
    }
});
//========================================================================================================================
app.listen(port, () => {
    // console.log(`Price Tracker API server listening at http://localhost:${port}`);
    console.log("Server started");
    // console.log('Price checks scheduled to run every 5 min');
});
