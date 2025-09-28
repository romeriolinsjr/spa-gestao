document.addEventListener("DOMContentLoaded", () => {
  // Pega as variáveis do Firebase que definimos no index.html
  const {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
  } = window.firebase;

  // Elementos da UI
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");
  const loginButton = document.getElementById("login-button");
  const signupButton = document.getElementById("signup-button");
  const logoutButton = document.getElementById("logout-button");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const authError = document.getElementById("auth-error");
  const userEmailSpan = document.getElementById("user-email");

  // Função para criar uma nova conta
  signupButton.addEventListener("click", async () => {
    const email = emailField.value;
    const password = passwordField.value;
    authError.textContent = ""; // Limpa erros antigos

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Conta criada com sucesso!", userCredential.user);
      // O onAuthStateChanged vai lidar com a exibição do app
    } catch (error) {
      authError.textContent = "Erro ao criar conta: " + error.message;
    }
  });

  // Função para fazer login
  loginButton.addEventListener("click", async () => {
    const email = emailField.value;
    const password = passwordField.value;
    authError.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Login bem-sucedido!", userCredential.user);
      // O onAuthStateChanged vai lidar com a exibição do app
    } catch (error) {
      authError.textContent = "Erro ao entrar: " + error.message;
    }
  });

  // Função para fazer logout
  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("Logout bem-sucedido!");
      // O onAuthStateChanged vai lidar com a exibição do app
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  });

  // O "fiscal" do Firebase: verifica se o usuário está logado ou não
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Usuário está logado!
      console.log("Usuário logado:", user.uid);
      userEmailSpan.textContent = user.email; // Mostra o e-mail do usuário
      authContainer.style.display = "none"; // Esconde a tela de login
      appContainer.style.display = "flex"; // Mostra a aplicação principal

      // Chama a função para carregar os dados do Firestore do usuário logado
      window.carregarDadosDoFirestore();
    } else {
      // Usuário está deslogado!
      console.log("Nenhum usuário logado.");
      authContainer.style.display = "flex"; // Mostra a tela de login
      appContainer.style.display = "none"; // Esconde a aplicação principal
    }
  });
});
