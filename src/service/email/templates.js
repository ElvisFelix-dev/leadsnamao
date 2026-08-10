/* eslint-disable prettier/prettier */
export function welcomeEmailTemplate(user) {
  return {
    subject: 'Bem-vindo ao CRM Imobiliário 🚀',

    htmlContent: `

      <div
        style="
          font-family:Arial;
          padding:30px;
        "
      >

        <h1>
          Olá ${user.name}! 👋
        </h1>


        <p>
          Seja bem-vindo ao nosso CRM imobiliário.
        </p>


        <p>
          Sua conta foi criada com sucesso.
        </p>


        <p>
          Agora você poderá:
        </p>


        <ul>
          <li>Gerenciar seus leads</li>
          <li>Acompanhar visitas</li>
          <li>Enviar propostas</li>
          <li>Acompanhar suas vendas</li>
        </ul>


        <br/>

        <strong>
          Equipe CRM
        </strong>

      </div>

    `,
  }
}

export function resetPasswordTemplate(user, resetUrl) {
  return {
    subject: 'Recuperação de senha 🔐',

    htmlContent: `

      <div
        style="
        font-family:Arial;
        padding:30px;
        "
      >

        <h2>
          Olá ${user.name}
        </h2>


        <p>
          Recebemos uma solicitação para alterar sua senha.
        </p>


        <a
          href="${resetUrl}"
          style="
          background:#2563eb;
          color:white;
          padding:12px 20px;
          border-radius:8px;
          text-decoration:none;
          "
        >

          Redefinir senha

        </a>


        <p>
          Caso não tenha solicitado,
          ignore este email.
        </p>


      </div>

    `,
  }
}

export function newLeadTemplate(broker, lead) {
  return {
    subject: 'Novo lead recebido 🎯',

    htmlContent: `

      <div
      style="
      font-family:Arial;
      padding:30px;
      "
      >

        <h2>
          Novo lead para você!
        </h2>


        <p>
          Olá ${broker.name},
        </p>


        <p>
          Você recebeu um novo cliente:
        </p>


        <hr/>


        <p>
          <strong>
          Nome:
          </strong>

          ${lead.name}
        </p>


        <p>
          <strong>
          Telefone:
          </strong>

          ${lead.phone || ''}
        </p>


        <p>
          <strong>
          Email:
          </strong>

          ${lead.email || ''}
        </p>


      </div>

    `,
  }
}
