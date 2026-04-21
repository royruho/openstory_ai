FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so the Vite dev server is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
