# Use an official Node.js runtime as the base image
FROM node:23-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Define an environment variable for Prisma
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN echo "DATABASE_URL=${DATABASE_URL}"

# Build the NestJS application 
RUN npm run prisma:generate && npm run build && npm run prisma:migrate:prod

# Expose the port your app runs on
EXPOSE 3346

CMD [" "]