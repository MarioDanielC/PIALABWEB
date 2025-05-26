function redirigir() {
  const userType = document.getElementById("userType").value;
  if (userType) {
    window.location.href = "registro.html";
  } else {
    alert("Por favor seleccione una opción.");
  }
}
