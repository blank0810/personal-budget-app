FROM node:20-alpine3.20

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# Generate Prisma Client
RUN ./node_modules/.bin/prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
