FROM node:23-alpine
ARG SERVER_NAME=test

WORKDIR /app

COPY ../-dist/${SERVER_NAME} ./

EXPOSE 8080
EXPOSE 8081

CMD ["node","bundle.js"]
