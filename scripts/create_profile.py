"""Script per creare il nuovo template profile.html"""

PROFILE_TEMPLATE = """{% extends "base.html" %}

{% block title %}Profilo Super Admin - Atlas Performance{% endblock %}

{% block extra_css %}
<style>
    .profile-card { transition: all 0.3s ease; }
    .profile-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up { animation: fadeInUp 0.6s ease-out; }
    .stat-mini-card { transition: all 0.3s ease; }
    .stat-mini-card:hover { transform: scale(1.05); }
    .tab-button { transition: all 0.3s ease; }
    .tab-button.active {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fadeInUp 0.4s ease-out; }
</style>
{% endblock %}

{% block content %}
<div class="max-w-7xl mx-auto space-y-6">
    <!--  Header -->
    <div class="fade-in-up">
        <div class="flex items-center justify-between mb-2 flex-wrap gap-4">
            <div>
                <h1 class="text-4xl font-bold text-gray-900 mb-2">👤 Profilo Super Admin</h1>
                <p class="text-gray-600 text-lg">Gestisci il tuo account e le impostazioni della piattaforma</p>
            </div>
            <a href="{{ url_for('super_admin.dashboard') }}"
               class="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition shadow-sm border border-gray-200">
                <i class="fas fa-arrow-left"></i>
                <span>Dashboard</span>
            </a>
        </div>
    </div>

    <!-- Profile Card -->
    <div class="profile-card bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden fade-in-up" style="animation-delay: 0.1s;">
        <!-- Header with Gradient -->
        <div class="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-4 md:px-8 py-8 md:py-12 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

            <div class="relative z-10 flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0">
                <!-- Avatar with Upload -->
                <div class="relative group">
                    <div class="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center shadow-2xl border-4 border-white border-opacity-30">
                        {% if current_user.avatar_url %}
                        <img src="{{ current_user.avatar_url }}" alt="Avatar" class="w-full h-full rounded-2xl object-cover">
                        {% else %}
                        <span class="text-4xl md:text-6xl font-bold text-white">{{ current_user.first_name[0] }}{{ current_user.last_name[0] }}</span>
                        {% endif %}
                    </div>
                    <button onclick="document.getElementById('avatar-upload').click()"
                            class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        <i class="fas fa-camera text-white text-2xl"></i>
                    </button>
                    <input type="file" id="avatar-upload" accept="image/*" class="hidden" onchange="uploadAvatar(this)">
                </div>

                <!-- Info -->
                <div class="flex-1 text-center md:text-left">
                    <div class="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 mb-2">
                        <h2 class="text-2xl md:text-4xl font-bold text-white">{{ current_user.first_name }} {{ current_user.last_name }}</h2>
                        <span class="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs md:text-sm font-semibold rounded-full border border-white border-opacity-30">
                            <i class="fas fa-shield-alt mr-1"></i> Super Admin
                        </span>
                    </div>
                    <p class="text-blue-100 text-base md:text-lg mb-4">
                        <i class="fas fa-envelope mr-2"></i>{{ current_user.email }}
                    </p>
                    <div class="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 text-xs md:text-sm text-blue-100">
                        <div class="flex items-center">
                            <i class="fas fa-calendar-alt mr-2"></i>
                            <span>Membro dal {{ current_user.created_at.strftime('%d/%m/%Y') }}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-clock mr-2"></i>
                            <span>Ultimo accesso: {{ current_user.last_login.strftime('%d/%m/%Y %H:%M') if current_user.last_login else 'Mai' }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200 bg-gray-50 px-4 md:px-8">
            <div class="flex space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                <button onclick="switchTab('overview')" class="tab-button active px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 whitespace-nowrap rounded-t-lg" id="tab-overview">
                    <i class="fas fa-chart-pie mr-2"></i>Panoramica
                </button>
                <button onclick="switchTab('personal')" class="tab-button px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 hover:bg-gray-100 whitespace-nowrap rounded-t-lg" id="tab-personal">
                    <i class="fas fa-user-edit mr-2"></i>Informazioni
                </button>
                <button onclick="switchTab('security')" class="tab-button px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 hover:bg-gray-100 whitespace-nowrap rounded-t-lg" id="tab-security">
                    <i class="fas fa-lock mr-2"></i>Sicurezza
                </button>
                <button onclick="switchTab('preferences')" class="tab-button px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 hover:bg-gray-100 whitespace-nowrap rounded-t-lg" id="tab-preferences">
                    <i class="fas fa-cog mr-2"></i>Preferenze
                </button>
                <button onclick="switchTab('activity')" class="tab-button px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 hover:bg-gray-100 whitespace-nowrap rounded-t-lg" id="tab-activity">
                    <i class="fas fa-history mr-2"></i>Attività
                </button>
                <button onclick="switchTab('tools')" class="tab-button px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base text-gray-700 hover:bg-gray-100 whitespace-nowrap rounded-t-lg" id="tab-tools">
                    <i class="fas fa-tools mr-2"></i>Strumenti
                </button>
            </div>
        </div>

        <!-- RESTO DEL CONTENUTO IN ARRIVO -->
    </div>
</div>

<script>
// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById('content-' + tabName).classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

// Avatar Upload
async function uploadAvatar(input) {
    if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append('avatar', input.files[0]);
        try {
            const response = await fetch('{{ url_for("super_admin.upload_avatar") }}', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                showNotification('Avatar aggiornato con successo!', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification(data.message || 'Errore durante l\'upload', 'error');
            }
        } catch (error) {
            showNotification('Errore di connessione', 'error');
        }
    }
}

// Notification Helper
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
</script>
{% endblock %}
"""

# Scrive il file
with open('app/templates/super_admin/profile.html', 'w', encoding='utf-8') as f:
    f.write(PROFILE_TEMPLATE)

print("✅ Template profile.html creato con successo!")
