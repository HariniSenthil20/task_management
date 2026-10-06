package com.taskmanage.controller;

import com.taskmanage.model.Activity;
import com.taskmanage.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/activities")
public class ActivityController {
    
    @Autowired
    private ActivityRepository activityRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getRecentActivities() {
        // Return all recent activities across the system for the dashboard feed and history
        List<Map<String, Object>> activities = activityRepository.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .map(a -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", a.getId());
                map.put("action", a.getAction());
                map.put("details", a.getDetails());
                map.put("createdAt", a.getCreatedAt());
                
                Map<String, Object> userMap = new HashMap<>();
                if (a.getUser() != null) {
                    userMap.put("id", a.getUser().getId());
                    userMap.put("username", a.getUser().getUsername());
                }
                map.put("user", userMap);
                
                return map;
            })
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(activities);
    }
}