module.exports = (req, res, next) => {
    const fixed_date  = req.body.fixed_date;
    const watch_dir   = req.body.watch_dir;

    return req.redis.set('jdj:settings', JSON.stringify({ fixed_date, watch_dir }))
      .then(result => {
        return res.status(200).send({ success: true });
      })
      .catch(next)
    ;
}
