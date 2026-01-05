using System.Net.Http.Json;
using System.Text.Json;

namespace backend.Services
{
    public interface IExpoPushNotificationService
    {
        Task<bool> SendPushNotificationAsync(string expoPushToken, string title, string body, object? data = null);
        Task SendPushNotificationToUserAsync(string userId, string title, string body, object? data = null);
    }

    public class ExpoPushNotificationService : IExpoPushNotificationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ExpoPushNotificationService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private const string ExpoPushApiUrl = "https://exp.host/--/api/v2/push/send";

        public ExpoPushNotificationService(
            HttpClient httpClient, 
            ILogger<ExpoPushNotificationService> logger,
            IServiceProvider serviceProvider)
        {
            _httpClient = httpClient;
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public async Task<bool> SendPushNotificationAsync(string expoPushToken, string title, string body, object? data = null)
        {
            if (string.IsNullOrEmpty(expoPushToken)) return false;

            var message = new
            {
                to = expoPushToken,
                title = title,
                body = body,
                data = data ?? new { },
                sound = "default",
                priority = "high",
                channelId = "default"
            };

            try
            {
                // Expo API accepts an array of messages
                var response = await _httpClient.PostAsJsonAsync(ExpoPushApiUrl, new[] { message });
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Push notification sent successfully to {Token}", expoPushToken);
                    return true;
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to send push notification to {Token}. Error: {Error}", expoPushToken, error);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending push notification to {Token}", expoPushToken);
                return false;
            }
        }

        public async Task SendPushNotificationToUserAsync(string userId, string title, string body, object? data = null)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<backend.Data.FlowerMarketDbContext>();

            var user = await context.Users.FindAsync(userId);
            if (user != null && !string.IsNullOrEmpty(user.ExpoPushToken))
            {
                await SendPushNotificationAsync(user.ExpoPushToken, title, body, data);
            }
        }
    }
}
