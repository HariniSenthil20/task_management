package com.taskmanage.controller;

import com.taskmanage.model.Notification;
import com.taskmanage.model.User;
import com.taskmanage.repository.NotificationRepository;
import com.taskmanage.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        
        List<Notification> notifications = notificationRepository.findAll().stream()
            .filter(n -> n.getUser().getId().equals(user.getId()))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/read")
    public ResponseEntity<?> markAllAsRead() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        
        List<Notification> notifications = notificationRepository.findAll().stream()
            .filter(n -> n.getUser().getId().equals(user.getId()) && !n.isRead())
            .collect(Collectors.toList());
            
        for(Notification n : notifications) {
            n.setRead(true);
        }
        notificationRepository.saveAll(notifications);
        
        return ResponseEntity.ok().build();
    }
}