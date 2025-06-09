FROM node:18-alpine

# Sets our working directory to /app
WORKDIR /app

# Copies package.json and package-lock.json
# Runs npm install
# Copies rest of src files
COPY package*.json ./
RUN npm install
COPY . .

# Exposes port 9187
# Runs `node index.js`
EXPOSE 9187
CMD ["node", "index.js"]
