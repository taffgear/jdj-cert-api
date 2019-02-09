"use strict"

const fs            = require('fs');
const path          = require('path');
const bb            = require('bluebird');
const express       = require("express");
const basicAuth     = require('express-basic-auth');
const cors          = require('cors');
const multer        = require('multer');
const bodyParser    = require("body-parser");
const crypto        = require('crypto');
const moment        = require('moment');
const nconf         = require('nconf');
const sql 		    = bb.promisifyAll(require("mssql"));
const Redis         = require('ioredis');
const get           = require('lodash/get');
const reduce        = require('lodash/reduce');
const find          = require('lodash/find');

const handlers      = require('./handlers');
const auth          = require('./helpers/auth.middleware.js');

const cnf           = nconf.argv().env().file({ file: path.resolve(__dirname + '/config.json') });

get_insts(cnf).then(setup).then(run).catch(console.log);

function get_insts(cnf)
{
    return bb.map(cnf.get('sql:databases'), db => getMssqlPool(db.name).then(conn => ({ db, conn })))
        .then(results => {
            const db = find(results, { db: { default: true } }, null);

            if (!db) throw new Error('No default mssql connection defined');

            return bb.props({
                app         : express(),
                dbpools     : reduce(results, (acc, o) => { acc[o.db.name] = o.conn; return acc }, {}),
                mssql       : db.conn,
                redis       : new Redis()

            }).tap(insts => {
                return insts.redis.get('jdj:settings').then(result => {
                  insts.settings = (result ? JSON.parse(result) : {});

                  return insts;
                });
            });
        })
    ;
}

function getMssqlPool(db)
{
    return new sql.ConnectionPool({
      user		: cnf.get('sql:user'),
      password	: cnf.get('sql:password'),
      server 	: cnf.get('sql:server'),
      database	: db
    }).connect().then((conn) => {
        console.log('connected to database: %s', db);
        return conn;
   })
   .catch(e => {
     console.log(e);
     return null;
   });
}

function setup(insts)
{
    const updateSettings = (req, res, next) => {
        const watchDir = req.body.watch_dir;

        insts.settings.watch_dir  = (watchDir.length && watchDir.substr(-1) !== '/' ? watchDir + '/' : watchDir);
        insts.settings.approved   = get(req, 'body.approved', null);
        insts.settings.unapproved = get(req, 'body.unapproved', null);
        insts.settings.expired    = get(req, 'body.expired', null);

        req.body.watch_dir = watchDir;

        next();
    };

    insts.app.use(cors({
      origin: '*',
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }));

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const sWatchDir = get(insts.settings, 'watch_dir');

        if (sWatchDir && fs.existsSync(sWatchDir))
            cb(null, sWatchDir);
        else
          cb(null, cnf.get('watchdir'));
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    });

    const upload =  multer({ storage });

    insts.app.use(bodyParser.json({ limit: '50mb' }));
    insts.app.use(bodyParser.urlencoded({ extended: true }));

    insts.app.use((req, res, next) => {
      req.mssql         = insts.mssql;
      req.dbpools       = insts.dbpools;
      req.redis         = insts.redis;
      req.settings      = insts.settings;
      req.upload        = upload;
      req.jwt_secret    = cnf.get('jwt_secret');

      next();
    });

    insts.app.get("/stock/find/:itemno", auth.checkToken, handlers.stock.find);
    insts.app.get("/stock/findin", auth.checkToken, handlers.stock.findIn);
    insts.app.put("/stock", auth.checkToken, handlers.stock.update);
    insts.app.get("/stock/approved/:limit", auth.checkToken, handlers.stock.approved);
    insts.app.get("/stock/unapproved/:limit", auth.checkToken, handlers.stock.unapproved);
    insts.app.get("/stock/expired/:limit", auth.checkToken, handlers.stock.expired);
    insts.app.get("/contdoc/find/:itemno", auth.checkToken, handlers.contdoc.find);
    insts.app.post("/contdoc", auth.checkToken, handlers.contdoc.create);
    insts.app.get("/contitem/status/:date", auth.checkToken, handlers.contitem);
    insts.app.post("/files", auth.checkToken, upload.fields([{ name: "documents" }]), handlers.files.upload);
    insts.app.get("/logs", auth.checkToken, handlers.logs);
    insts.app.get("/settings", auth.checkToken, handlers.settings.get);
    insts.app.put("/settings", auth.checkToken, updateSettings, handlers.settings.update );

    insts.app.use('/users', require('./users/users.controller'));

    insts.app.use(handlers.error);

    return insts;
}

function run(insts)
{
    insts.app.listen(cnf.get('bind:port') || 3000, () => {
        console.log("Listening on port %s...", cnf.get('bind:port'));
    });
}
