const jwt = require('jsonwebtoken');

const autenticarToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log('Authorization header:', authHeader);

    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token recibido:', token);

    if (!token) {
      console.log('Token no recibido');
      return res.status(401).json({ message: 'Token requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Error en verificación de token:', err);
        return res.status(403).json({ message: 'Token inválido' });
      }

      req.user = user;
      next();
    });
  } catch (err) {
    console.error('Error inesperado en middleware autenticarToken:', err);
    res.status(500).json({ message: 'Error interno de autenticación' });
  }
};

module.exports = autenticarToken;
