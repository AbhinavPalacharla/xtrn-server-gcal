FROM node:20-alpine

RUN npm install -g esbuild

WORKDIR /app

# Copy the xtrn_lib dependency first
COPY xtrn_lib ./xtrn_lib

# Copy package files
COPY xtrn-server-gcal/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY xtrn-server-gcal/src ./src

# Create dist directory
RUN mkdir -p dist

CMD ["esbuild", "src/index.ts", "--bundle", "--platform=node", "--outfile=dist/index.js", "--external:xtrn-server"]