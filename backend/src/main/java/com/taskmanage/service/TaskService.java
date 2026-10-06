package com.taskmanage.service;

import com.taskmanage.dto.LabelDTO;
import com.taskmanage.dto.TaskDTO;
import com.taskmanage.dto.UserDTO;
import com.taskmanage.model.Activity;
import com.taskmanage.model.Comment;
import com.taskmanage.model.Label;
import com.taskmanage.model.Project;
import com.taskmanage.model.Task;
import com.taskmanage.model.User;
import com.taskmanage.model.enums.TaskPriority;
import com.taskmanage.model.enums.TaskStatus;
import com.taskmanage.repository.ActivityRepository;
import com.taskmanage.repository.CommentRepository;
import com.taskmanage.repository.LabelRepository;
import com.taskmanage.repository.ProjectRepository;
import com.taskmanage.repository.TaskRepository;
import com.taskmanage.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LabelRepository labelRepository;
    @Autowired
    private ActivityService activityService;
    @Autowired
    private ActivityRepository activityRepository;
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private com.taskmanage.repository.ProjectMemberRepository projectMemberRepository;

    @Transactional
    public TaskDTO createTask(Long projectId, String title, String description, String username, String priority, String startDate, String dueDate, Long assigneeId) {
        User creator = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        Project project = projectRepository.findById(projectId).orElseThrow(() -> new RuntimeException("Project not found"));

        Task task = new Task();
        task.setProject(project);
        task.setTitle(title);
        task.setDescription(description);
        task.setCreatedBy(creator);
        if (priority != null && !priority.isEmpty()) {
            task.setPriority(TaskPriority.valueOf(priority.toUpperCase()));
        }
        if (startDate != null && !startDate.isEmpty()) {
            task.setStartDate(LocalDate.parse(startDate));
        }
        if (dueDate != null && !dueDate.isEmpty()) {
            task.setDueDate(LocalDate.parse(dueDate));
        }
        
        // Auto-assign TEAM_MEMBER tasks to themselves
        if (creator.getRole().getName() == com.taskmanage.model.enums.ERole.ROLE_TEAM_MEMBER) {
            task.setAssignee(creator);
        } else if (assigneeId != null) {
            User assignee = userRepository.findById(assigneeId).orElseThrow(() -> new RuntimeException("Assignee not found"));
            task.setAssignee(assignee);
        }
        
        Task saved = taskRepository.save(task);
        activityService.logActivity(project, saved, creator, "CREATED_TASK", "Task '" + title + "' was created.");
        
        // Auto-add to project members if assignee is set and not a member
        if (saved.getAssignee() != null) {
            boolean isProjectMember = projectMemberRepository.findByUserId(saved.getAssignee().getId()).stream()
                .anyMatch(pm -> pm.getProject().getId().equals(project.getId()));
            if (!isProjectMember) {
                com.taskmanage.model.ProjectMember pm = new com.taskmanage.model.ProjectMember();
                pm.setProject(project);
                pm.setUser(saved.getAssignee());
                projectMemberRepository.save(pm);
            }
        }
        
        return mapToDTO(saved);
    }

    public List<TaskDTO> getTasksByProject(Long projectId) {
        return taskRepository.findByProjectId(projectId).stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public Page<TaskDTO> searchTasks(Long projectId, String status, String priority, String search, Long assigneeId, Pageable pageable) {
        Specification<Task> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("project").get("id"), projectId));
            if (status != null && !status.isEmpty()) predicates.add(cb.equal(root.get("status"), TaskStatus.valueOf(status.toUpperCase())));
            if (priority != null && !priority.isEmpty()) predicates.add(cb.equal(root.get("priority"), TaskPriority.valueOf(priority.toUpperCase())));
            if (assigneeId != null) predicates.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")), likePattern), cb.like(cb.lower(root.get("description")), likePattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return taskRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Transactional
    public TaskDTO updateTask(Long taskId, String title, String description, String startDate, String dueDate, String priority, String username) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getRole().getName() == com.taskmanage.model.enums.ERole.ROLE_TEAM_MEMBER) {
            boolean isCreator = task.getCreatedBy() != null && task.getCreatedBy().getId().equals(user.getId());
            boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(user.getId());
            if (!isCreator && !isAssignee) {
                throw new RuntimeException("Not authorized to edit this task");
            }
        }
        
        if (title != null) task.setTitle(title);
        if (description != null) task.setDescription(description);
        if (priority != null && !priority.isEmpty()) task.setPriority(TaskPriority.valueOf(priority.toUpperCase()));
        
        if (startDate != null && !startDate.isEmpty()) task.setStartDate(LocalDate.parse(startDate));
        else if (startDate != null) task.setStartDate(null);
        
        if (dueDate != null && !dueDate.isEmpty()) task.setDueDate(LocalDate.parse(dueDate));
        else if (dueDate != null) task.setDueDate(null);

        Task saved = taskRepository.save(task);
        activityService.logActivity(task.getProject(), saved, user, "UPDATED_TASK", "Task '" + task.getTitle() + "' was updated.");
        return mapToDTO(saved);
    }

    @Transactional
    public TaskDTO updateTaskStatusAndPriority(Long taskId, String statusStr, String priorityStr, String username) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
            
        if (statusStr != null) task.setStatus(TaskStatus.valueOf(statusStr.toUpperCase()));
        if (priorityStr != null) task.setPriority(TaskPriority.valueOf(priorityStr.toUpperCase()));
        
        Task saved = taskRepository.save(task);
        activityService.logActivity(task.getProject(), saved, user, "UPDATED_STATUS", "Task '" + task.getTitle() + "' status/priority changed.");
        
        // --- Trigger Notification ---
        if (saved.getAssignee() != null) {
            notificationService.createNotification(
                saved.getAssignee(), 
                "Task Status Changed", 
                "Status/priority changed for task: " + saved.getTitle()
            );
        }
        
        return mapToDTO(saved);
    }

    @Transactional
    public TaskDTO assignTask(Long taskId, Long assigneeId, String username) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        User assignee = userRepository.findById(assigneeId).orElseThrow(() -> new RuntimeException("Assignee not found"));
        
        task.setAssignee(assignee);
        Task saved = taskRepository.save(task);
        
        // Auto-add to project members if not already a member
        boolean isProjectMember = projectMemberRepository.findByUserId(assigneeId).stream()
            .anyMatch(pm -> pm.getProject().getId().equals(task.getProject().getId()));
        if (!isProjectMember) {
            com.taskmanage.model.ProjectMember pm = new com.taskmanage.model.ProjectMember();
            pm.setProject(task.getProject());
            pm.setUser(assignee);
            projectMemberRepository.save(pm);
        }

        activityService.logActivity(task.getProject(), saved, user, "ASSIGNED_TASK", "Task '" + task.getTitle() + "' assigned to " + assignee.getUsername());
        
        // --- Trigger Notification ---
        notificationService.createNotification(
            assignee,
            "Task Assigned",
            "You have been assigned to task: " + saved.getTitle()
        );

        return mapToDTO(saved);
    }
    
    @Transactional
    public void deleteTask(Long taskId, String username) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        
        // 1. Remove foreign key references in Activity table
        List<Activity> activities = activityRepository.findByTaskId(taskId);
        for (Activity act : activities) {
            act.setTask(null);
            activityRepository.save(act);
        }
        
        // 2. Delete all comments belonging to the task
        List<Comment> comments = commentRepository.findByTaskId(taskId);
        commentRepository.deleteAll(comments);

        taskRepository.delete(task);
        activityService.logActivity(task.getProject(), null, user, "DELETED_TASK", "Task '" + task.getTitle() + "' was deleted.");
    }

    private TaskDTO mapToDTO(Task t) {
        TaskDTO dto = new TaskDTO();
        dto.setId(t.getId());
        dto.setProjectId(t.getProject().getId());
        dto.setTitle(t.getTitle());
        dto.setDescription(t.getDescription());
        dto.setStatus(t.getStatus().name());
        dto.setPriority(t.getPriority().name());
        dto.setStartDate(t.getStartDate());
        dto.setDueDate(t.getDueDate());
        dto.setCreatedAt(t.getCreatedAt());
        dto.setUpdatedAt(t.getUpdatedAt());

        UserDTO creator = new UserDTO();
        creator.setId(t.getCreatedBy().getId());
        creator.setUsername(t.getCreatedBy().getUsername());
        creator.setEmail(t.getCreatedBy().getEmail());
        creator.setRole(t.getCreatedBy().getRole().getName().name());
        dto.setCreatedBy(creator);

        if (t.getAssignee() != null) {
            UserDTO assignee = new UserDTO();
            assignee.setId(t.getAssignee().getId());
            assignee.setUsername(t.getAssignee().getUsername());
            assignee.setEmail(t.getAssignee().getEmail());
            assignee.setRole(t.getAssignee().getRole().getName().name());
            dto.setAssignee(assignee);
        }

        List<LabelDTO> labels = t.getLabels().stream().map(l -> {
            LabelDTO ldto = new LabelDTO();
            ldto.setId(l.getId());
            ldto.setName(l.getName());
            ldto.setColor(l.getColor());
            return ldto;
        }).collect(Collectors.toList());
        dto.setLabels(labels);

        return dto;
    }
}