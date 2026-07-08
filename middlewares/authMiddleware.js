exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    req.session.returnTo = req.originalUrl; // Simpan URL yang ingin diakses
    res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).render('403', { title: 'Akses Dilarang' }); // Buat halaman 403 nanti
};
