# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Version stamping: .git is excluded from the image, so CI passes commit/date here.
ARG VITE_GIT_COMMIT=
ARG VITE_BUILD_DATE=
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}
ENV VITE_BUILD_DATE=${VITE_BUILD_DATE}
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
