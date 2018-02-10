const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const moment    = require("moment");
const errors    = require('../../lib/classes/errors');

const generateRecId = () => moment().format('YYYYMMDDHHmmss') + Math.floor(100000 + Math.random() * 900000);

module.exports = function (req, res, next) {
		return req.mssql.request()
		    .input('recid', sql.NVarChar, generateRecId())
		    .input('type', sql.NVarChar, req.body.type)
        .input('key', sql.NVarChar, req.body.key)
        .input('filename', sql.NVarChar, req.body.filename)
        .input('optflag', sql.Int, parseInt(req.body.optflag))
        .input('options', sql.Int, parseInt(req.body.options))
        .input('sid', sql.NVarChar, req.body.sid)
        .input('scantopdftype', sql.Int, parseInt(req.body.scantopdftype))
        .input('name', sql.NVarChar, req.body.name)
        .input('showinweb', sql.Int, parseInt(req.body.showinweb))
		    .query('INSERT INTO CONTDOC ([RECID], [TYPE], [KEY], [FILENAME], [OPTFLAG], [OPTIONS], [SID], [SCANTOPDFTYPE], [NAME], [SHOWINWEB]) VALUES(@recid, @type, @key, @filename, @optflag, @options, @sid, @scantopdftype, @name, @showinweb)')
        .then(result => res.status(200).send({ success: true, rowsAffected: result.rowsAffected[0]}))
        .catch(next)
      ;
}
