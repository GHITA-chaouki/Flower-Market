using backend.Auth.Dto;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Auth
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly FlowerMarketDbContext _context;

        public AuthController(
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            IConfiguration configuration,
            FlowerMarketDbContext context
        )
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _context = context;
        }

        // =========================
        // LOGIN
        // =========================
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
            {
                return Unauthorized(new { error = "Email ou mot de passe incorrect" });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(
                user,
                dto.Password,
                false
            );

            if (!result.Succeeded)
            {
                return Unauthorized(new { error = "Email ou mot de passe incorrect" });
            }

            // 🔒 Vérification prestataire approuvé
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            if (string.IsNullOrEmpty(role))
            {
                return StatusCode(500, new { error = "Aucun rôle attribué à l'utilisateur" });
            }

            if (role == "Prestataire" && !user.IsApproved)
            {
                return Unauthorized(new
                {
                    message = "PENDING_APPROVAL",
                    isApproved = false
                });
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                role,
                isApproved = user.IsApproved
            });
        }

        // =========================
        // FIREBASE TOKEN EXCHANGE
        // =========================
        [HttpPost("firebase-exchange")]
        public async Task<IActionResult> FirebaseExchange([FromBody] FirebaseExchangeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirebaseUid))
            {
                return BadRequest(new { error = "Firebase UID is required" });
            }

            // Find or create user by Firebase UID
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.FirebaseUid);
            
            if (user == null)
            {
                // User doesn't exist in SQL Server, create them
                if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Role))
                {
                    return BadRequest(new { error = "Email and Role are required for new users" });
                }

                user = new AppUser
                {
                    Id = dto.FirebaseUid, // Use Firebase UID as the user ID
                    UserName = dto.Email,
                    Email = dto.Email,
                    FullName = dto.FullName ?? dto.Email,
                    EmailConfirmed = true, // Firebase already confirmed it
                    IsApproved = dto.Role == "Prestataire" ? (dto.IsApproved ?? false) : true
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return StatusCode(500, new { error = "Failed to create user in database" });
                }

                // Assign role
                await _userManager.AddToRoleAsync(user, dto.Role);
                
                // Create Store for Prestataire users
                if (dto.Role == "Prestataire")
                {
                    var store = new Store
                    {
                        Name = dto.FullName ?? dto.Email,
                        Description = "Boutique de " + (dto.FullName ?? dto.Email),
                        Address = "", // Empty for now, can be updated later
                        PrestataireId = user.Id
                    };
                    
                    _context.Stores.Add(store);
                    await _context.SaveChangesAsync();
                    
                    Console.WriteLine($"✅ Created Store for Prestataire: {store.Name}");
                }
                
                Console.WriteLine($"✅ Created new user in SQL Server: {dto.Email} ({dto.Role})");
            }
            else
            {
                // Sync IsApproved from Firebase if provided
                if (dto.IsApproved.HasValue && user.IsApproved != dto.IsApproved.Value)
                {
                    Console.WriteLine($"[FirebaseExchange] Syncing IsApproved for user {user.Email}: {user.IsApproved} -> {dto.IsApproved.Value}");
                    user.IsApproved = dto.IsApproved.Value;
                    await _userManager.UpdateAsync(user);
                }
            }

            // Get user roles
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? "Client";


            // Check if Prestataire is approved
            if (role == "Prestataire" && !user.IsApproved)
            {
                return Unauthorized(new
                {
                    message = "PENDING_APPROVAL",
                    isApproved = false
                });
            }

            // Generate backend JWT with roles
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, role),
                new Claim("sub", user.Id) // Add sub claim for compatibility
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            // 🔔 Ensure a "Welcome" notification exists for this Prestataire
            if (role == "Prestataire")
            {
                var hasWelcome = await _context.Notifications.AnyAsync(n => n.UserId == user.Id && n.Title == "Bienvenue !");
                if (!hasWelcome)
                {
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "Bienvenue !",
                        Message = "Bienvenue sur FlowerMarket ! Vous recevrez ici vos alertes de commande et notifications système.",
                        Type = "Prestataire",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        UserId = user.Id
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                role,
                isApproved = user.IsApproved,
                uid = user.Id
            });
        }

        // =========================
        // REGISTER CLIENT
        // =========================
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var exists = await _userManager.FindByEmailAsync(dto.Email);
            if (exists != null)
            {
                return BadRequest(new { error = "Email déjà utilisé" });
            }

            var user = new AppUser
            {
                FullName = dto.FullName,
                Email = dto.Email,
                UserName = dto.Email,
                IsApproved = true
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "IDENTITY_ERROR",
                    errors = result.Errors.Select(e => e.Description)
                });
            }

            await _userManager.AddToRoleAsync(user, "Client");

            await _context.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Nouveau Client",
                Message = $"Le client {dto.FullName} ({dto.Email}) vient de s'inscrire.",
                Type = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Inscription réussie" });
        }

        // =========================
        // REGISTER PRESTATAIRE
        // =========================
        [HttpPost("register-prestataire")]
        public async Task<IActionResult> RegisterPrestataire(RegisterPrestataireDto dto)
        {
            var exists = await _userManager.FindByEmailAsync(dto.Email);
            if (exists != null)
            {
                return BadRequest(new { error = "Email déjà utilisé" });
            }

            var user = new AppUser
            {
                FullName = dto.FullName,
                Email = dto.Email,
                UserName = dto.Email,
                IsApproved = false // 🔴 validation admin requise
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "IDENTITY_ERROR",
                    errors = result.Errors.Select(e => e.Description)
                });
            }

            await _userManager.AddToRoleAsync(user, "Prestataire");

            await _context.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Nouveau Prestataire",
                Message = $"Le prestataire {dto.FullName} ({dto.Email}) est en attente de validation.",
                Type = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Demande envoyée. En attente de validation par l’administrateur."
            });
        }
    }
}
