package com.taskmanage.controller;

import com.taskmanage.dto.TaskDTO;
import com.taskmanage.dto.response.MessageResponse;
import com.taskmanage.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    
    @Autowired
    private TaskService taskService;

    @PostMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<TaskDTO> createTask(@PathVariable Long projectId, @RequestBody Map<String, String> req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long assigneeId = req.get("assigneeId") != null && !String.valueOf(req.get("assigneeId")).isEmpty() ? Long.parseLong(String.valueOf(req.get("assigneeId"))) : null;
        return ResponseEntity.ok(taskService.createTask(
            projectId, req.get("title"), req.get("description"), username, req.get("priority"), req.get("startDate"), req.get("dueDate"), assigneeId
        ));
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<List<TaskDTO>> getProjectTasks(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }

    @GetMapping("/project/{projectId}/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<Page<TaskDTO>> searchTasks(
            @PathVariable Long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(taskService.searchTasks(projectId, status, priority, search, assigneeId, PageRequest.of(page, size)));
    }

    @PutMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long taskId, @RequestBody Map<String, String> req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(taskService.updateTask(taskId, req.get("title"), req.get("description"), req.get("startDate"), req.get("dueDate"), req.get("priority"), username));
    }

    @PutMapping("/{taskId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<TaskDTO> updateStatusAndPriority(@PathVariable Long taskId, @RequestBody Map<String, String> req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(taskService.updateTaskStatusAndPriority(taskId, req.get("status"), req.get("priority"), username));
    }
    
    @PutMapping("/{taskId}/assign/{assigneeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<TaskDTO> assignTask(@PathVariable Long taskId, @PathVariable Long assigneeId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(taskService.assignTask(taskId, assigneeId, username));
    }

    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        taskService.deleteTask(taskId, username);
        return ResponseEntity.ok(new MessageResponse("Task deleted successfully"));
    }
}