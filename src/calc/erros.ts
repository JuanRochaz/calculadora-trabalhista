/** Erro de dado informado pelo usuário: a mensagem é mostrada na tela. */
export class EntradaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'EntradaInvalidaError'
  }
}
