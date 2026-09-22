export const welcomeTemplate = (userName) => `
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">

  <title>Bem-vindo ao Leads Na Mão</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f5f7fb;
  font-family:Arial, Helvetica, sans-serif;
  color:#172033;
">

  <!-- PREHEADER -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  ">
    Sua conta no Leads Na Mão foi criada com sucesso.
  </div>


  <!-- PAGE -->
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color:#f5f7fb;
    "
  >
    <tr>

      <td
        align="center"
        style="
          padding:40px 20px;
        "
      >


        <!-- MAIN CONTAINER -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,23,42,0.08);
          "
        >


          <!-- HEADER -->
          <tr>

            <td
              align="center"
              style="
                padding:34px 30px 32px;
                background:#0b1020;
              "
            >

              <!-- LOGO -->
              <table
                width="94"
                height="94"
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
                style="
                  width:94px;
                  height:94px;
                  background:#ffffff;
                  border-radius:50%;
                  margin:0 auto 16px;
                "
              >
                <tr>

                  <td
                    align="center"
                    valign="middle"
                  >

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790027717/logoImg_g4jai0.png"
                      alt="Leads Na Mão"
                      width="76"
                      height="76"
                      style="
                        display:block;
                        width:76px;
                        height:76px;
                        object-fit:cover;
                        border:0;
                        border-radius:50%;
                        margin:0 auto;
                      "
                    >

                  </td>

                </tr>
              </table>


              <!-- BRAND -->
              <div style="
                color:#ffffff;
                font-size:22px;
                font-weight:700;
                letter-spacing:-0.5px;
                margin-top:4px;
              ">
                Leads
                <span style="color:#4f8cff;">
                  Na Mão
                </span>
              </div>


              <!-- TAGLINE -->
              <p style="
                margin:8px 0 0;
                color:#94a3b8;
                font-size:13px;
                line-height:1.5;
              ">
                Gestão inteligente de leads imobiliários
              </p>

            </td>

          </tr>


          <!-- CONTENT -->
          <tr>

            <td style="
              padding:42px 40px 36px;
            ">


              <!-- WELCOME ICON -->
              <table
                width="52"
                height="52"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:52px;
                  height:52px;
                  background:#eff6ff;
                  border-radius:12px;
                  margin-bottom:24px;
                "
              >
                <tr>

                  <td
                    align="center"
                    valign="middle"
                  >

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029421/coding_ztg6oa.png"
                      alt="Bem-vindo"
                      width="25"
                      height="25"
                      style="
                        display:block;
                        width:25px;
                        height:25px;
                        border:0;
                        margin:0 auto;
                      "
                    >

                  </td>

                </tr>
              </table>


              <!-- TITLE -->
              <h1 style="
                margin:0 0 12px;
                color:#111827;
                font-size:26px;
                line-height:1.25;
                font-weight:700;
                letter-spacing:-0.5px;
              ">
                Seja bem-vindo ao Leads Na Mão
              </h1>


              <!-- GREETING -->
              <p style="
                margin:0 0 22px;
                color:#374151;
                font-size:16px;
                line-height:1.7;
              ">
                Olá, <strong>${userName}</strong>!
              </p>


              <!-- INTRO -->
              <p style="
                margin:0 0 16px;
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                É um prazer ter você conosco.
                Sua conta no <strong>Leads Na Mão</strong> foi criada
                com sucesso e você já pode começar a utilizar a plataforma.
              </p>


              <!-- BENEFITS BOX -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background:#f8fafc;
                  border:1px solid #e5e7eb;
                  border-radius:10px;
                  margin:26px 0;
                "
              >

                <tr>

                  <td style="
                    padding:18px 20px;
                  ">

                    <p style="
                      margin:0 0 8px;
                      color:#1e293b;
                      font-size:14px;
                      font-weight:700;
                      line-height:1.5;
                    ">
                      Uma plataforma feita para simplificar sua rotina
                    </p>

                    <p style="
                      margin:0;
                      color:#64748b;
                      font-size:13px;
                      line-height:1.7;
                    ">
                      Organize seus leads, acompanhe oportunidades,
                      gerencie seu pipeline e tenha uma visão mais clara
                      da operação da sua imobiliária.
                    </p>

                  </td>

                </tr>

              </table>


              <!-- CTA -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:30px 0 32px;
                "
              >

                <tr>

                  <td align="center">

                    <a
                      href="https://leadsnamao.netlify.app"
                      target="_blank"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        padding:15px 30px;
                        border-radius:9px;
                        box-shadow:0 5px 14px rgba(37,99,235,0.25);
                      "
                    >
                      Acessar o Leads Na Mão
                    </a>

                  </td>

                </tr>

              </table>


              <!-- SUPPORT -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  border-top:1px solid #e5e7eb;
                "
              >

                <tr>

                  <td>

                    <p style="
                      margin:24px 0 0;
                      color:#6b7280;
                      font-size:13px;
                      line-height:1.7;
                    ">

                      <strong style="
                        color:#374151;
                      ">
                        Precisa de ajuda?
                      </strong>

                      <br>

                      Nossa equipe está à disposição para ajudar você
                      a aproveitar ao máximo todos os recursos da plataforma.

                    </p>

                  </td>

                </tr>

              </table>


              <!-- SIGNATURE -->
              <p style="
                margin:28px 0 0;
                color:#4b5563;
                font-size:14px;
                line-height:1.6;
              ">
                Atenciosamente,
                <br>

                <strong style="
                  color:#111827;
                ">
                  Equipe Leads Na Mão
                </strong>
              </p>


            </td>

          </tr>


          <!-- FOOTER -->
          <tr>

            <td
              align="center"
              style="
                padding:30px 30px 26px;
                background:#f8fafc;
                border-top:1px solid #eef2f7;
              "
            >


              <!-- SOCIAL TITLE -->
              <p style="
                margin:0 0 18px;
                color:#64748b;
                font-size:12px;
                font-weight:600;
                letter-spacing:0.2px;
              ">
                Acompanhe o Leads Na Mão
              </p>


              <!-- SOCIAL ICONS -->
              <table
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
              >

                <tr>


                  <!-- INSTAGRAM -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://instagram.com/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029421/instagram_2_fdha6o.png"
                        alt="Instagram"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- LINKEDIN -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://www.linkedin.com/company/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029422/linkedin_viwpr7.png"
                        alt="LinkedIn"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- WEBSITE -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://leadsnamao.netlify.app"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029773/internet_jquf0w.png"
                        alt="Site"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                </tr>

              </table>


              <!-- SOCIAL LABELS -->
              <p style="
                margin:12px 0 0;
                color:#94a3b8;
                font-size:11px;
              ">
                Instagram&nbsp;&nbsp;•&nbsp;&nbsp;LinkedIn&nbsp;&nbsp;•&nbsp;&nbsp;Site
              </p>


              <!-- COPYRIGHT -->
              <p style="
                margin:20px 0 0;
                color:#94a3b8;
                font-size:11px;
                line-height:1.6;
              ">
                © ${new Date().getFullYear()} Leads Na Mão
                <br>
                Gestão inteligente para imobiliárias.
              </p>


            </td>

          </tr>


        </table>


        <!-- OUTSIDE FOOTER -->
        <p style="
          max-width:560px;
          margin:20px auto 0;
          color:#94a3b8;
          font-size:11px;
          line-height:1.5;
        ">
          Este é um e-mail automático. Por favor, não responda diretamente
          a esta mensagem.
        </p>


      </td>

    </tr>
  </table>


</body>
</html>
`

export const resetPasswordTemplate = (userName, resetUrl) => `
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">

  <title>Redefinição de senha | Leads Na Mão</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f5f7fb;
  font-family:Arial, Helvetica, sans-serif;
  color:#172033;
">

  <!-- PREHEADER -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  ">
    Solicitação para redefinir sua senha no Leads Na Mão.
  </div>


  <!-- PAGE -->
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color:#f5f7fb;
    "
  >
    <tr>

      <td
        align="center"
        style="
          padding:40px 20px;
        "
      >


        <!-- MAIN CONTAINER -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,23,42,0.08);
          "
        >


          <!-- HEADER -->
          <tr>

            <td
              align="center"
              style="
                padding:34px 30px 32px;
                background:#0b1020;
              "
            >

              <!-- LOGO -->
              <table
                width="94"
                height="94"
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
                style="
                  width:94px;
                  height:94px;
                  background:#ffffff;
                  border-radius:50%;
                  margin:0 auto 16px;
                "
              >
                <tr>
                  <td align="center" valign="middle">

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790027717/logoImg_g4jai0.png"
                      alt="Leads Na Mão"
                      width="76"
                      height="76"
                      style="
                        display:block;
                        width:76px;
                        height:76px;
                        object-fit:cover;
                        border:0;
                        border-radius:50%;
                        margin:0 auto;
                      "
                    >

                  </td>
                </tr>
              </table>


              <!-- BRAND -->
              <div style="
                color:#ffffff;
                font-size:22px;
                font-weight:700;
                letter-spacing:-0.5px;
                margin-top:4px;
              ">
                Leads
                <span style="color:#4f8cff;">
                  Na Mão
                </span>
              </div>


              <!-- TAGLINE -->
              <p style="
                margin:8px 0 0;
                color:#94a3b8;
                font-size:13px;
                line-height:1.5;
              ">
                Gestão inteligente de leads imobiliários
              </p>

            </td>

          </tr>


          <!-- CONTENT -->
          <tr>

            <td style="
              padding:42px 40px 36px;
            ">


              <!-- SECURITY ICON -->
              <table
                width="52"
                height="52"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:52px;
                  height:52px;
                  background:#eff6ff;
                  border-radius:12px;
                  margin-bottom:24px;
                "
              >
                <tr>

                  <td
                    align="center"
                    valign="middle"
                  >

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029554/padlock_bo7h5f.png"
                      alt="Segurança"
                      width="25"
                      height="25"
                      style="
                        display:block;
                        width:25px;
                        height:25px;
                        border:0;
                        margin:0 auto;
                      "
                    >

                  </td>

                </tr>
              </table>


              <!-- TITLE -->
              <h1 style="
                margin:0 0 12px;
                color:#111827;
                font-size:26px;
                line-height:1.25;
                font-weight:700;
                letter-spacing:-0.5px;
              ">
                Redefinição de senha
              </h1>


              <!-- GREETING -->
              <p style="
                margin:0 0 22px;
                color:#374151;
                font-size:16px;
                line-height:1.7;
              ">
                Olá, <strong>${userName}</strong>!
              </p>


              <!-- DESCRIPTION -->
              <p style="
                margin:0 0 16px;
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Recebemos uma solicitação para redefinir a senha
                da sua conta no <strong>Leads Na Mão</strong>.
              </p>


              <p style="
                margin:0;
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Se foi você quem solicitou essa alteração, clique
                no botão abaixo para criar uma nova senha.
              </p>


              <!-- BUTTON -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:32px 0;
                "
              >
                <tr>

                  <td align="center">

                    <a
                      href="${resetUrl}"
                      target="_blank"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        padding:15px 30px;
                        border-radius:9px;
                        box-shadow:0 5px 14px rgba(37,99,235,0.25);
                      "
                    >
                      Redefinir minha senha
                    </a>

                  </td>

                </tr>
              </table>


              <!-- EXPIRATION -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background:#f8fafc;
                  border:1px solid #e5e7eb;
                  border-radius:10px;
                  margin-bottom:28px;
                "
              >
                <tr>

                  <td style="
                    padding:16px 18px;
                  ">

                    <p style="
                      margin:0;
                      color:#475569;
                      font-size:13px;
                      line-height:1.6;
                    ">

                      <strong style="
                        color:#1e293b;
                      ">
                        Link válido por 15 minutos
                      </strong>

                      <br>

                      Por segurança, o link expirará após esse período.
                      Caso expire, você poderá solicitar uma nova redefinição.

                    </p>

                  </td>

                </tr>
              </table>


              <!-- ALTERNATIVE LINK -->
              <p style="
                margin:0 0 10px;
                color:#6b7280;
                font-size:12px;
                line-height:1.6;
              ">
                Se o botão acima não funcionar, copie e cole o endereço
                abaixo no seu navegador:
              </p>


              <p style="
                margin:0 0 28px;
                word-break:break-all;
                font-size:12px;
                line-height:1.6;
              ">

                <a
                  href="${resetUrl}"
                  target="_blank"
                  style="
                    color:#2563eb;
                    text-decoration:none;
                  "
                >
                  ${resetUrl}
                </a>

              </p>


              <!-- SECURITY MESSAGE -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  border-top:1px solid #e5e7eb;
                "
              >
                <tr>

                  <td>

                    <p style="
                      margin:24px 0 0;
                      color:#6b7280;
                      font-size:13px;
                      line-height:1.6;
                    ">

                      <strong style="
                        color:#374151;
                      ">
                        Não solicitou essa alteração?
                      </strong>

                      <br>

                      Você pode ignorar este e-mail.
                      Sua senha permanecerá inalterada e nenhuma ação
                      será necessária.

                    </p>

                  </td>

                </tr>
              </table>


            </td>

          </tr>


          <!-- FOOTER -->
          <tr>

            <td
              align="center"
              style="
                padding:30px 30px 26px;
                background:#f8fafc;
                border-top:1px solid #eef2f7;
              "
            >


              <!-- SOCIAL TITLE -->
              <p style="
                margin:0 0 18px;
                color:#64748b;
                font-size:12px;
                font-weight:600;
                letter-spacing:0.2px;
              ">
                Acompanhe o Leads Na Mão
              </p>


              <!-- SOCIAL ICONS -->
              <table
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
              >

                <tr>


                  <!-- INSTAGRAM -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://instagram.com/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029421/instagram_2_fdha6o.png"
                        alt="Instagram"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- LINKEDIN -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://www.linkedin.com/company/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029422/linkedin_viwpr7.png"
                        alt="LinkedIn"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- WEBSITE -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://leadsnamao.netlify.app"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029773/internet_jquf0w.png"
                        alt="Site"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                </tr>

              </table>


              <!-- SOCIAL LABELS -->
              <p style="
                margin:12px 0 0;
                color:#94a3b8;
                font-size:11px;
              ">
                Instagram&nbsp;&nbsp;•&nbsp;&nbsp;LinkedIn&nbsp;&nbsp;•&nbsp;&nbsp;Site
              </p>


              <!-- COPYRIGHT -->
              <p style="
                margin:20px 0 0;
                color:#94a3b8;
                font-size:11px;
                line-height:1.6;
              ">
                © ${new Date().getFullYear()} Leads Na Mão
                <br>
                Gestão inteligente para imobiliárias.
              </p>


            </td>

          </tr>


        </table>


        <!-- OUTSIDE FOOTER -->
        <p style="
          max-width:560px;
          margin:20px auto 0;
          color:#94a3b8;
          font-size:11px;
          line-height:1.5;
        ">
          Este é um e-mail automático. Por favor, não responda diretamente
          a esta mensagem.
        </p>


      </td>
    </tr>
  </table>


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
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">

  <title>Novo lead recebido | Leads Na Mão</title>
</head>


<body style="
  margin:0;
  padding:0;
  background-color:#f5f7fb;
  font-family:Arial, Helvetica, sans-serif;
  color:#172033;
">

  <!-- PREHEADER -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  ">
    Um novo lead foi atribuído a você no Leads Na Mão.
  </div>


  <!-- PAGE -->
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color:#f5f7fb;
    "
  >

    <tr>

      <td
        align="center"
        style="
          padding:40px 20px;
        "
      >


        <!-- MAIN CONTAINER -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,23,42,0.08);
          "
        >


          <!-- HEADER -->
          <tr>

            <td
              align="center"
              style="
                padding:34px 30px 32px;
                background:#0b1020;
              "
            >

              <!-- LOGO -->
              <table
                width="94"
                height="94"
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
                style="
                  width:94px;
                  height:94px;
                  background:#ffffff;
                  border-radius:50%;
                  margin:0 auto 16px;
                "
              >

                <tr>

                  <td
                    align="center"
                    valign="middle"
                  >

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790027717/logoImg_g4jai0.png"
                      alt="Leads Na Mão"
                      width="76"
                      height="76"
                      style="
                        display:block;
                        width:76px;
                        height:76px;
                        object-fit:cover;
                        border:0;
                        border-radius:50%;
                        margin:0 auto;
                      "
                    >

                  </td>

                </tr>

              </table>


              <!-- BRAND -->
              <div style="
                color:#ffffff;
                font-size:22px;
                font-weight:700;
                letter-spacing:-0.5px;
                margin-top:4px;
              ">
                Leads
                <span style="color:#4f8cff;">
                  Na Mão
                </span>
              </div>


              <!-- TAGLINE -->
              <p style="
                margin:8px 0 0;
                color:#94a3b8;
                font-size:13px;
                line-height:1.5;
              ">
                Gestão inteligente de leads imobiliários
              </p>

            </td>

          </tr>


          <!-- CONTENT -->
          <tr>

            <td style="
              padding:42px 40px 36px;
            ">


              <!-- NOTIFICATION ICON -->
              <table
                width="52"
                height="52"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:52px;
                  height:52px;
                  background:#eff6ff;
                  border-radius:12px;
                  margin-bottom:24px;
                "
              >

                <tr>

                  <td
                    align="center"
                    valign="middle"
                  >

                    <img
                      src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029554/padlock_bo7h5f.png"
                      alt="Novo lead"
                      width="25"
                      height="25"
                      style="
                        display:block;
                        width:25px;
                        height:25px;
                        border:0;
                        margin:0 auto;
                      "
                    >

                  </td>

                </tr>

              </table>


              <!-- TITLE -->
              <h1 style="
                margin:0 0 12px;
                color:#111827;
                font-size:26px;
                line-height:1.25;
                font-weight:700;
                letter-spacing:-0.5px;
              ">
                Novo lead recebido
              </h1>


              <!-- GREETING -->
              <p style="
                margin:0 0 22px;
                color:#374151;
                font-size:16px;
                line-height:1.7;
              ">
                Olá, <strong>${brokerName}</strong>!
              </p>


              <!-- INTRO -->
              <p style="
                margin:0;
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Um novo lead foi atribuído a você e já está disponível
                para atendimento no <strong>Leads Na Mão</strong>.
              </p>


              <!-- ATTENTION BOX -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:24px 0 28px;
                  background:#eff6ff;
                  border:1px solid #dbeafe;
                  border-radius:10px;
                "
              >

                <tr>

                  <td style="
                    padding:15px 17px;
                  ">

                    <p style="
                      margin:0;
                      color:#1e40af;
                      font-size:13px;
                      line-height:1.6;
                    ">

                      <strong>
                        Novo atendimento disponível
                      </strong>

                      <br>

                      Confira os dados abaixo e faça o primeiro contato
                      com o cliente.

                    </p>

                  </td>

                </tr>

              </table>


              <!-- LEAD SECTION TITLE -->
              <p style="
                margin:0 0 12px;
                color:#111827;
                font-size:14px;
                font-weight:700;
                line-height:1.5;
              ">
                Informações do lead
              </p>


              <!-- LEAD CARD -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background:#f8fafc;
                  border:1px solid #e5e7eb;
                  border-radius:12px;
                "
              >

                <!-- NAME -->
                <tr>

                  <td style="
                    padding:17px 18px;
                    border-bottom:1px solid #e5e7eb;
                  ">

                    <p style="
                      margin:0 0 5px;
                      color:#94a3b8;
                      font-size:11px;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      font-weight:700;
                    ">
                      Nome
                    </p>

                    <p style="
                      margin:0;
                      color:#1e293b;
                      font-size:15px;
                      font-weight:600;
                      line-height:1.5;
                    ">
                      ${leadName || '-'}
                    </p>

                  </td>

                </tr>


                <!-- EMAIL -->
                <tr>

                  <td style="
                    padding:17px 18px;
                    border-bottom:1px solid #e5e7eb;
                  ">

                    <p style="
                      margin:0 0 5px;
                      color:#94a3b8;
                      font-size:11px;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      font-weight:700;
                    ">
                      E-mail
                    </p>

                    <p style="
                      margin:0;
                      color:#1e293b;
                      font-size:14px;
                      line-height:1.5;
                      word-break:break-word;
                    ">
                      ${leadEmail || '-'}
                    </p>

                  </td>

                </tr>


                <!-- PHONE -->
                <tr>

                  <td style="
                    padding:17px 18px;
                    border-bottom:1px solid #e5e7eb;
                  ">

                    <p style="
                      margin:0 0 5px;
                      color:#94a3b8;
                      font-size:11px;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      font-weight:700;
                    ">
                      Telefone
                    </p>

                    <p style="
                      margin:0;
                      color:#1e293b;
                      font-size:14px;
                      line-height:1.5;
                    ">
                      ${leadPhone || '-'}
                    </p>

                  </td>

                </tr>


                <!-- REGION -->
                <tr>

                  <td style="
                    padding:17px 18px;
                    border-bottom:1px solid #e5e7eb;
                  ">

                    <p style="
                      margin:0 0 5px;
                      color:#94a3b8;
                      font-size:11px;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      font-weight:700;
                    ">
                      Região de interesse
                    </p>

                    <p style="
                      margin:0;
                      color:#1e293b;
                      font-size:14px;
                      line-height:1.5;
                    ">
                      ${leadRegion || '-'}
                    </p>

                  </td>

                </tr>


                <!-- SOURCE -->
                <tr>

                  <td style="
                    padding:17px 18px;
                  ">

                    <p style="
                      margin:0 0 5px;
                      color:#94a3b8;
                      font-size:11px;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      font-weight:700;
                    ">
                      Origem
                    </p>

                    <p style="
                      margin:0;
                      color:#1e293b;
                      font-size:14px;
                      line-height:1.5;
                    ">
                      ${leadSource || '-'}
                    </p>

                  </td>

                </tr>

              </table>


              <!-- CTA -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:32px 0 0;
                "
              >

                <tr>

                  <td align="center">

                    <a
                      href="${process.env.FRONTEND_URL}/lead-detail/${leadId}"
                      target="_blank"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        padding:15px 30px;
                        border-radius:9px;
                        box-shadow:0 5px 14px rgba(37,99,235,0.25);
                      "
                    >
                      Ver lead no sistema
                    </a>

                  </td>

                </tr>

              </table>


              <!-- TIP -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top:28px;
                  border-top:1px solid #e5e7eb;
                "
              >

                <tr>

                  <td>

                    <p style="
                      margin:22px 0 0;
                      color:#64748b;
                      font-size:13px;
                      line-height:1.7;
                    ">

                      <strong style="
                        color:#374151;
                      ">
                        Dica de atendimento
                      </strong>

                      <br>

                      Faça o primeiro contato o quanto antes.
                      Um atendimento rápido ajuda a manter o interesse
                      do lead e facilita a continuidade da negociação.

                    </p>

                  </td>

                </tr>

              </table>


            </td>

          </tr>


          <!-- FOOTER -->
          <tr>

            <td
              align="center"
              style="
                padding:30px 30px 26px;
                background:#f8fafc;
                border-top:1px solid #eef2f7;
              "
            >


              <!-- SOCIAL TITLE -->
              <p style="
                margin:0 0 18px;
                color:#64748b;
                font-size:12px;
                font-weight:600;
                letter-spacing:0.2px;
              ">
                Acompanhe o Leads Na Mão
              </p>


              <!-- SOCIAL ICONS -->
              <table
                cellpadding="0"
                cellspacing="0"
                border="0"
                align="center"
              >

                <tr>


                  <!-- INSTAGRAM -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://instagram.com/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029421/instagram_2_fdha6o.png"
                        alt="Instagram"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- LINKEDIN -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://www.linkedin.com/company/leadsnamao"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029422/linkedin_viwpr7.png"
                        alt="LinkedIn"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                  <!-- WEBSITE -->
                  <td
                    align="center"
                    valign="middle"
                    style="
                      padding:0 5px;
                    "
                  >

                    <a
                      href="https://leadsnamao.netlify.app"
                      target="_blank"
                      style="
                        display:inline-block;
                        width:40px;
                        height:40px;
                        background:#ffffff;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-decoration:none;
                      "
                    >

                      <img
                        src="https://res.cloudinary.com/dgdtytc5n/image/upload/v1790029773/internet_jquf0w.png"
                        alt="Site"
                        width="18"
                        height="18"
                        style="
                          display:block;
                          width:18px;
                          height:18px;
                          border:0;
                          margin:11px auto 0;
                        "
                      >

                    </a>

                  </td>


                </tr>

              </table>


              <!-- SOCIAL LABELS -->
              <p style="
                margin:12px 0 0;
                color:#94a3b8;
                font-size:11px;
              ">
                Instagram&nbsp;&nbsp;•&nbsp;&nbsp;LinkedIn&nbsp;&nbsp;•&nbsp;&nbsp;Site
              </p>


              <!-- COPYRIGHT -->
              <p style="
                margin:20px 0 0;
                color:#94a3b8;
                font-size:11px;
                line-height:1.6;
              ">
                © ${new Date().getFullYear()} Leads Na Mão
                <br>
                Gestão inteligente para imobiliárias.
              </p>


            </td>

          </tr>


        </table>


        <!-- OUTSIDE FOOTER -->
        <p style="
          max-width:560px;
          margin:20px auto 0;
          color:#94a3b8;
          font-size:11px;
          line-height:1.5;
        ">
          Este é um e-mail automático. Por favor, não responda diretamente
          a esta mensagem.
        </p>


      </td>

    </tr>

  </table>


</body>
</html>
`
}
