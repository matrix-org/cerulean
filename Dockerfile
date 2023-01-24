FROM node:14-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn \
    YARN_CACHE_FOLDER=/root/.yarn \
    yarn install --frozen-lockfile
COPY . .
RUN --mount=type=cache,target=/root/.yarn \
    YARN_CACHE_FOLDER=/root/.yarn \
    yarn build

FROM nginx:1.22-alpine AS server
COPY ./etc/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder ./app/build /usr/share/nginx/html
