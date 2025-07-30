# Cross-Chain Swap API Server

This server provides the backend API for the cross-chain swap application. It is built with NestJS and uses Prisma for database interactions.

## Features

*   Provides API endpoints for managing cross-chain swaps.
*   Handles interactions with both EVM and Aptos blockchains.
*   Integrates with 1inch Fusion for swap execution.

## Project Structure

```
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── aptos/         # Aptos-related logic
│   ├── evm/           # EVM-related logic
│   └── fusion/        # 1inch Fusion integration
├── prisma/
│   └── schema.prisma  # Database schema
├── Dockerfile
└── docker-compose.yaml
```

## Setup and Running

### Prerequisites

*   Node.js v16+
*   Docker and Docker Compose
*   A running PostgreSQL database (or configure `docker-compose.yaml`)

### Installation

1.  Navigate to the `server` directory:
    ```shell
    cd server
    ```
2.  Install dependencies:
    ```shell
    npm install
    ```
3.  Set up your environment variables by copying the example file from the root directory and updating it for the server's needs. You'll need database credentials and blockchain provider URLs.

### Database Migrations

Run the following command to apply database migrations:
```shell
npx prisma migrate dev
```

### Running the server

#### Development

```shell
npm run start:dev
```

#### Docker

To build and run the server with Docker:

```shell
docker-compose up --build
```

## API Endpoints

The server exposes the following API endpoints:

*   **`GET /`**: Health check endpoint.

### Swaps
*   **`POST /swaps`**: Create a new cross-chain swap.
*   **`GET /swaps/:id`**: Get the status of a swap.

### Aptos Endpoints

*   **`GET /aptos/balance/:address`**: Get the token balance for an Aptos address.
*   **`POST /aptos/htlc`**: Create an HTLC on Aptos.

### EVM Endpoints

*   **`GET /evm/balance/:address`**: Get the token balance for an EVM address.
*   **`POST /evm/htlc`**: Create an HTLC on an EVM chain.

### Fusion Endpoints

*   **`POST /fusion/quote`**: Get a swap quote from 1inch Fusion.
*   **`POST /fusion/order`**: Create a 1inch Fusion order.
