/**
 * O FORMATO PADRÃO de uma mensagem dentro do WiaPipe.
 * Todo fornecedor (YCloud, simulador, outro no futuro) é traduzido para isto.
 */
export type MensagemPadrao = {
  /** Número da EMPRESA que recebeu ou enviou (só dígitos, ex.: 5511900000001) */
  numeroEmpresa: string;
  /** Número do CLIENTE (só dígitos) */
  telefoneCliente: string;
  /** Nome do cliente no WhatsApp, quando o fornecedor mandar */
  nomeContato?: string;
  /** Texto da mensagem */
  texto: string;
  /** Id da mensagem no fornecedor, para não gravar a mesma duas vezes */
  idExterno: string;
  /** Quando a mensagem foi enviada */
  quando: Date;
  /**
   * ENTRADA   = o cliente mandou para a empresa
   * SAIDA_APP = a vendedora mandou pelo app ou pelo WhatsApp Web (o "eco")
   */
  direcao: 'ENTRADA' | 'SAIDA_APP';
};