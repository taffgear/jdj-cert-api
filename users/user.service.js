const sql = require("mssql");

module.exports = { authenticate };

function authenticate(req) {
    const username = req.body.username;
    const password = req.body.password;

    return findUser(req.dbpools['IHBASE'], username, password)
        .then(user => {
            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
        })
    ;
}

function findUser(conn, username, password) {
    return conn.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
    .query('SELECT TOP 1 RECORDER AS id, NAME AS username, LEVEL, SUPERUSER, WINUSERNAME, STATUS, LASTON FROM dbo.Users WHERE NAME = @username AND PASSWORD = @password')
    .then(result => result.recordset[0])
}
