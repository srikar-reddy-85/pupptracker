# pupptracker



pupptracker is a Node.js application that scrapes product information from Amazon and Flipkart, allows users to search and select products, and notifies them of price drops.

## Features

- Scrape product information from Amazon and Flipkart
- Search for products in the scraped data
- Select and track specific products
- Automated price checking and email notifications for price drops
- RESTful API for interacting with the application

## Prerequisites

- Node.js
- npm
- Google Chrome (for Puppeteer)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/srikar-reddy-85/pupptracker
   cd pupptracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Gmail account for sending notifications:
   - Open the script and replace `example@gmail.com` and `*** *** *** ***` with your Gmail address and app password.

## Usage

Start the server:
```
node server.js
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

## API Endpoints

1. **Scrape a product**
   - POST `/api/scrape`
   - Body: `{ "product": "product name" }`

2. **Search for products**
   - POST `/api/search`
   - Body: `{ "query": "search query" }`

3. **Select products to track**
   - POST `/api/select-products`
   - Body: `{ "selectedIds": [0, 1, 2] }`

4. **Check for price drops**
   - GET `/api/check-price`

5. **Display selected items**
   - GET `/api/selected-items`

6. **Remove products from tracking**
   - POST `/api/remove-products`
   - Body: `{ "indices": [0, 1, 2] }`

## Files

- `server.js`: Main application file
- `data.txt`: Stores scraped product data
- `selectedItems.json`: Stores selected items for price tracking

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
