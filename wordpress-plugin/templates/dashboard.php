<div class="web-app-dashboard">
    <div class="dashboard-header">
        <h2>Welcome, <?php echo esc_html(wp_get_current_user()->display_name); ?></h2>
        <div class="user-avatar">
            <!-- PLACE IMAGE: User profile picture (150x150px) -->
            <?php echo get_avatar(get_current_user_id(), 150); ?>
        </div>
    </div>

    <div class="dashboard-stats">
        <div class="stat-card">
            <div class="stat-icon">
                <!-- PLACE IMAGE: Activity icon (64x64px) -->
                <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/activity-icon.png" alt="Activity">
            </div>
            <div class="stat-content">
                <h3>Recent Activity</h3>
                <p class="stat-number">24</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">
                <!-- PLACE IMAGE: Projects icon (64x64px) -->
                <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/projects-icon.png" alt="Projects">
            </div>
            <div class="stat-content">
                <h3>Active Projects</h3>
                <p class="stat-number">8</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">
                <!-- PLACE IMAGE: Messages icon (64x64px) -->
                <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/messages-icon.png" alt="Messages">
            </div>
            <div class="stat-content">
                <h3>Messages</h3>
                <p class="stat-number">12</p>
            </div>
        </div>
    </div>

    <div class="dashboard-content">
        <div class="dashboard-left">
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div class="activity-list">
                    <div class="activity-item">
                        <div class="activity-icon">
                            <!-- PLACE IMAGE: Document icon (32x32px) -->
                            <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/document-icon.png" alt="Document">
                        </div>
                        <div class="activity-content">
                            <p>Document uploaded: Project Report.pdf</p>
                            <span class="activity-time">2 hours ago</span>
                        </div>
                    </div>
                    
                    <div class="activity-item">
                        <div class="activity-icon">
                            <!-- PLACE IMAGE: Task icon (32x32px) -->
                            <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/task-icon.png" alt="Task">
                        </div>
                        <div class="activity-content">
                            <p>Task completed: Review client feedback</p>
                            <span class="activity-time">5 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <button class="action-btn primary">
                        <!-- PLACE IMAGE: Add icon (24x24px) -->
                        <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/add-icon.png" alt="Add">
                        New Project
                    </button>
                    <button class="action-btn secondary">
                        <!-- PLACE IMAGE: Upload icon (24x24px) -->
                        <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/upload-icon.png" alt="Upload">
                        Upload File
                    </button>
                    <button class="action-btn tertiary">
                        <!-- PLACE IMAGE: Report icon (24x24px) -->
                        <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/report-icon.png" alt="Report">
                        Generate Report
                    </button>
                </div>
            </div>
        </div>

        <div class="dashboard-right">
            <div class="notifications">
                <h3>Notifications</h3>
                <div class="notification-list">
                    <div class="notification-item unread">
                        <div class="notification-icon">
                            <!-- PLACE IMAGE: Alert icon (24x24px) -->
                            <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/alert-icon.png" alt="Alert">
                        </div>
                        <div class="notification-content">
                            <p>System maintenance scheduled for tonight</p>
                            <span class="notification-time">1 hour ago</span>
                        </div>
                    </div>
                    
                    <div class="notification-item">
                        <div class="notification-icon">
                            <!-- PLACE IMAGE: Info icon (24x24px) -->
                            <img src="<?php echo WAI_PLUGIN_URL; ?>assets/images/info-icon.png" alt="Info">
                        </div>
                        <div class="notification-content">
                            <p>New feature update available</p>
                            <span class="notification-time">3 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="progress-tracker">
                <h3>Progress Overview</h3>
                <div class="progress-item">
                    <div class="progress-header">
                        <span>Project Alpha</span>
                        <span>75%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 75%"></div>
                    </div>
                </div>
                
                <div class="progress-item">
                    <div class="progress-header">
                        <span>Client Onboarding</span>
                        <span>45%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 45%"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>