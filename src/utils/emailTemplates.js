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
<<<<<<< HEAD

export const resetPasswordTemplate = (userName, resetUrl) => `

<!DOCTYPE html>

<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Recuperação de senha</title>

</head>


<body>

<div style="
font-family: Arial, Helvetica, sans-serif;
background-color:#f4f6f8;
padding:30px;
">


<table
align="center"
cellpadding="0"
cellspacing="0"
width="600"

style="
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 4px 15px rgba(0,0,0,0.08);
">


<!-- HEADER -->

<tr>

<td
align="center"
bgcolor="#2e4fbb"
style="
padding:25px;
">

<h1
style="
color:#ffffff;
margin:0;
font-size:26px;
">

LeadsnaMão

</h1>


</td>

</tr>



<!-- CONTENT -->

<tr>

<td

style="
padding:35px;
color:#333;
">


<h2
style="
margin-top:0;
font-size:22px;
">

Olá, ${userName}!

</h2>



<p
style="
font-size:16px;
line-height:1.6;
">

Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>LeadsnaMão</strong>.

</p>



<p
style="
font-size:16px;
line-height:1.6;
">

Se foi você quem solicitou essa alteração, clique no botão abaixo para criar uma nova senha.

</p>




<!-- BUTTON -->


<div
style="
text-align:center;
margin:35px 0;
">


<a

href="${resetUrl}"

style="
background:#2563eb;
color:#ffffff;
padding:14px 32px;
border-radius:8px;
font-size:16px;
font-weight:bold;
text-decoration:none;
display:inline-block;
">

Redefinir minha senha

</a>


</div>




<p

style="
font-size:14px;
color:#555;
line-height:1.5;
">

Este link é válido por <strong>15 minutos</strong>.

Após esse período, será necessário solicitar uma nova recuperação de senha.

</p>



<hr

style="
border:none;
border-top:1px solid #eee;
margin:30px 0;
">


<p

style="
font-size:13px;
color:#777;
">

Caso você não tenha solicitado essa alteração, ignore este email. Sua senha permanecerá segura.

</p>



</td>

</tr>




<!-- FOOTER -->


<tr>

<td

align="center"

bgcolor="#f4f6f8"

style="
padding:20px;
font-size:12px;
color:#666;
">

<p style="margin:0;">

© ${new Date().getFullYear()} LeadsnaMão - Todos os direitos reservados

</p>


</td>


</tr>



</table>


</div>


</body>


</html>

`

export function leadAssignedTemplate({
  brokerName,
  leadName,
  leadEmail,
  leadPhone,
  leadRegion,
  leadSource,
  leadId,
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">

<head>
<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Novo Lead Recebido</title>

</head>

<body
style="
margin:0;
padding:0;
background:#f1f5f9;
font-family:Arial,Helvetica,sans-serif;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
>

<tr>

<td
align="center"
style="
padding:40px 20px;
"
>

<table
width="600"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:16px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,0.08);
"
>


<!-- HEADER -->

<tr>

<td
style="
background:#0f172a;
padding:30px;
text-align:center;
"
>

<h1
style="
margin:0;
color:#ffffff;
font-size:28px;
"
>
LeadsnaMão
</h1>


<p
style="
margin:10px 0 0;
color:#94a3b8;
font-size:14px;
"
>
Gestão inteligente de clientes
</p>


</td>

</tr>



<!-- CONTENT -->

<tr>

<td
style="
padding:35px;
"
>


<h2
style="
margin:0 0 15px;
color:#0f172a;
font-size:22px;
"
>

Olá, ${brokerName}! 👋

</h2>


<p
style="
color:#475569;
font-size:16px;
line-height:1.6;
"
>

Você recebeu um novo lead atribuído para atendimento.

Entre em contato o quanto antes para aumentar suas chances de conversão.

</p>



<!-- LEAD CARD -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:25px;
background:#f8fafc;
border-radius:12px;
border:1px solid #e2e8f0;
"
>

<tr>

<td
style="
padding:25px;
"
>


<h3
style="
margin:0 0 20px;
color:#2563eb;
font-size:18px;
"
>

Novo Cliente

</h3>



<p
style="
margin:8px 0;
color:#334155;
"
>
<strong>Nome:</strong>
${leadName}
</p>


<p
style="
margin:8px 0;
color:#334155;
"
>
<strong>Email:</strong>
${leadEmail || '-'}
</p>


<p
style="
margin:8px 0;
color:#334155;
"
>
<strong>Telefone:</strong>
${leadPhone || '-'}
</p>


<p
style="
margin:8px 0;
color:#334155;
"
>
<strong>Região:</strong>
${leadRegion || '-'}
</p>


<p
style="
margin:8px 0;
color:#334155;
"
>
<strong>Origem:</strong>
${leadSource || '-'}
</p>


</td>

</tr>

</table>



<!-- BUTTON -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:30px;
"
>

<tr>

<td
align="center"
>

<a
href="${process.env.FRONTEND_URL}/lead-detail/${leadId}"
style="
display:inline-block;
background:#2563eb;
color:#ffffff;
padding:14px 30px;
border-radius:10px;
text-decoration:none;
font-weight:bold;
font-size:15px;
"
>

Ver Lead no Sistema

</a>


</td>

</tr>

</table>



<p
style="
margin-top:30px;
color:#64748b;
font-size:14px;
line-height:1.5;
"
>

Dica: leads recentes possuem maior chance de conversão.
Procure realizar o primeiro contato rapidamente.

</p>



</td>

</tr>



<!-- FOOTER -->

<tr>

<td
style="
background:#f8fafc;
padding:20px;
text-align:center;
"
>

<p
style="
margin:0;
color:#94a3b8;
font-size:12px;
"
>

Este é um aviso automático enviado pelo LeadsnaMão.

</p>


<p
style="
margin:8px 0 0;
color:#94a3b8;
font-size:12px;
"
>

© ${new Date().getFullYear()} LeadsnaMão

</p>


</td>

</tr>


</table>


</td>

</tr>

</table>


</body>

</html>
`
}
=======
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
