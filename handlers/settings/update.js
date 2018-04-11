module.exports = (req, res, next) => {
    const fixed_date  = req.body.fixed_date;
    const watch_dir   = req.body.watch_dir;
    const approved    = req.body.approved;
    const unapproved  = req.body.unapproved;
    const expired     = req.body.expired;

    return req.redis.set('jdj:settings', JSON.stringify({ fixed_date, watch_dir, approved, unapproved, expired }))
      .then(result => {
        return res.status(200).send({ success: true });
      })
      .catch(next)
    ;
}
