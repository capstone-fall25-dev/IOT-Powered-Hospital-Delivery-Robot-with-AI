using System.Net;
using System.Net.Mail;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Xử lý gửi email thông báo cho nhân viên bệnh viện
    /// </summary>
    public class EmailHelper
    {
        private readonly IConfiguration _config;

        public EmailHelper(IConfiguration config)
        {
            _config = config;
        }

        /// <summary>
        /// Gửi email thông báo
        /// </summary>
        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            // Lấy cấu hình email từ appsettings.json
            var smtpHost = _config["EmailSettings:SmtpHost"];
            var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"]);
            var smtpUser = _config["EmailSettings:SmtpUser"];
            var smtpPass = _config["EmailSettings:SmtpPass"];
            var senderName = _config["EmailSettings:SenderName"];
            var enableSsl = bool.Parse(_config["EmailSettings:EnableSsl"]);

            using (var client = new SmtpClient(smtpHost, smtpPort))
            {
                // Xác thực với server email
                client.Credentials = new NetworkCredential(smtpUser, smtpPass);
                client.EnableSsl = enableSsl;

                // Tạo nội dung email
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(smtpUser, senderName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                // Thêm người nhận và gửi
                mailMessage.To.Add(toEmail);
                await client.SendMailAsync(mailMessage);
            }
        }
    }
}
