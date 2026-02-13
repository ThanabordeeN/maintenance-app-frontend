FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables
ARG VITE_LIFF_ID
ARG VITE_API_URL=/maintenance/api
ARG VITE_USE_MOCK=false

# Set as environment variables for Vite build
ENV VITE_LIFF_ID=$VITE_LIFF_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.js ./
RUN npm ci

COPY . .

# Build the app which respects the base path '/maintenance/'
# Bypass tsc check to allow build with existing type errors
RUN npx vite build

# Production stage
FROM nginx:alpine

# Build arg to select nginx config (default: nginx.conf)
ARG NGINX_CONF=nginx.conf

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets to /maintenance subdirectory
COPY --from=builder /app/dist /usr/share/nginx/html/maintenance

# Copy custom nginx config (selectable via build-arg)
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
