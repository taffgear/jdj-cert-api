# jdj-cert-api
API used for transfering data (SQL) to and from client app (jdj-cert-app) and background process (jdj-cert-worker)

## setup

### Download and install redis
https://redis.io/download  

git clone git@github.com:taffgear/jdj-cert-api.git  
cd jdj-cert-api    
nano config.json    

```
{
  "bind": {
    "port": 5000
  },
  "auth": {
    "username": "username",
    "password": "password"
  },
  "sql" : {
    "user": "sql_user",
    "password": "sql_password",
    "server": "server_ip",
    "database": "database_name"
  },
  "watchdir": "/watch/dir/for/files/"
}

```

### Start app

DEBUG=* node app.js
