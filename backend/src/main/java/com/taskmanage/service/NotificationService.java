package com.taskmanage.service;

import com.taskmanage.model.Notification;
import com.taskmanage.model.User;
import com.taskmanage.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Transactional
    public void createNotification(User user, String title, String message) {
        if (user == null) return;
        Notification notif = new Notification();
        notif.setUser(user);
        notif.setTitle(title);
        notif.setMessage(message);
        notificationRepository.save(notif);
    }
}
