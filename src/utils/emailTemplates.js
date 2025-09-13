export const welcomeTemplate = (userName) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a)</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
      <table align="center" cellpadding="0" cellspacing="0" width="600"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td align="center" bgcolor="#2e4fbbff" style="padding: 20px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LeadsnaMão</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; color: #333;">
            <h2 style="margin-top: 0;">Olá, ${userName}!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Seja muito bem-vindo a <strong>LeadsnaMão</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              A partir de agora, você terá acesso a uma plataforma <strong>moderna</strong> e
              <strong>prática</strong> para gerenciar <strong>leads</strong>
              de forma simples e eficiente.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              Nossa equipe está à disposição para ajudar você a aproveitar ao máximo todos os recursos.
            </p>
            <br/>
            <p style="font-size: 16px;">Atenciosamente,</p>
            <p style="font-weight: bold; font-size: 16px; margin: 0;"> LeadsnaMão</p>
          </td>
        </tr>
        <tr>
        <td align="center" bgcolor="#f4f6f8" style="padding: 15px; font-size: 12px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} LeadsnaMão - Todos os direitos reservados</p>
        </td>
      </tr>
      </table>
    </div>
</body>
</html>
`
