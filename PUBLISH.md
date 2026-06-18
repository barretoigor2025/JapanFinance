# Publicar o JapanFinance rapidamente

## Opcao A: GitHub pelo navegador

1. Abra o repositorio `barretoigor2025/JapanFinance`.
2. Toque em **Add file** > **Upload files**.
3. Envie todos os arquivos e pastas deste projeto descompactado.
4. Commit na branch `main`.
5. Va em **Settings** > **Pages**.
6. Em **Build and deployment**, escolha **GitHub Actions**.
7. Depois do workflow rodar, o app fica publicado no GitHub Pages.

## Opcao B: pelo celular usando Termux

```bash
git clone https://github.com/barretoigor2025/JapanFinance.git
cd JapanFinance
# copie os arquivos deste projeto para esta pasta
git add .
git commit -m "Primeira versao do JapanFinance"
git push origin main
```

## Importante

Nao suba o arquivo real de backup para o repositorio publico. Use o botao **Importar backup** dentro do app.
