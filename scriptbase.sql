CREATE DATABASE PIA_Eventos;
GO

USE PIA_Eventos;
GO

CREATE TABLE Roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL
);
GO

CREATE TABLE Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_rol) REFERENCES Roles(id_rol)
);
GO

CREATE TABLE Categorias (
    id_categoria INT IDENTITY(1,1) PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL
);
GO

CREATE TABLE Evento (
    id_evento INT IDENTITY(1,1) PRIMARY KEY,
    nombre_evento VARCHAR(100) NOT NULL,
    fecha_hora DATETIME NOT NULL,
    lugar TEXT NOT NULL,
    id_categoria INT NOT NULL,
    imagen_url VARCHAR(255),
    FOREIGN KEY (id_categoria) REFERENCES Categorias(id_categoria)
);
GO

CREATE TABLE Reseñas (
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    comentario TEXT NOT NULL,
    fecha_reseña DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (id_usuario, id_evento),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_evento) REFERENCES Evento(id_evento)
);
GO

CREATE TABLE Calificaciones (
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    cal_estrellas INT NOT NULL CHECK (cal_estrellas >= 1 AND cal_estrellas <= 5),
    fecha_cal DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (id_usuario, id_evento),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_evento) REFERENCES Evento(id_evento)
);
GO

CREATE TABLE Asistencias (
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    confirmacion BIT NOT NULL DEFAULT 1,
    fecha_confir DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (id_usuario, id_evento),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_evento) REFERENCES Evento(id_evento)
);
GO

