package com.taskmanage.service;

import com.taskmanage.dto.ProjectDTO;
import com.taskmanage.dto.UserDTO;
import com.taskmanage.model.Project;
import com.taskmanage.model.ProjectMember;
import com.taskmanage.model.User;
import com.taskmanage.model.Workspace;
import com.taskmanage.repository.ProjectMemberRepository;
import com.taskmanage.repository.ProjectRepository;
import com.taskmanage.repository.UserRepository;
import com.taskmanage.repository.WorkspaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectService {
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private WorkspaceRepository workspaceRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProjectMemberRepository projectMemberRepository;
    @Autowired
    private ActivityService activityService;
    @Autowired
    private NotificationService notificationService;

    @Transactional
    public ProjectDTO createProject(Long workspaceId, String name, String description, String username) {
        User creator = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new RuntimeException("Workspace not found"));

        Project project = new Project();
        project.setWorkspace(workspace);
        project.setName(name);
        project.setDescription(description);
        project.setCreatedBy(creator);
        Project saved = projectRepository.save(project);

        ProjectMember member = new ProjectMember();
        member.setProject(saved);
        member.setUser(creator);
        projectMemberRepository.save(member);

        activityService.logActivity(saved, null, creator, "CREATED_PROJECT", "Project " + name + " was created.");

        return mapToDTO(saved);
    }

    public List<ProjectDTO> getProjectsByWorkspace(Long workspaceId) {
        return projectRepository.findByWorkspaceId(workspaceId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public ProjectDTO getProjectById(Long projectId) {
        Project p = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));
        return mapToDTO(p);
    }

    @Transactional
    public ProjectDTO updateProject(Long projectId, String name, String description, String status, String startDate, String endDate) {
        Project p = projectRepository.findById(projectId).orElseThrow();
        if (name != null) p.setName(name);
        if (description != null) p.setDescription(description);
        if (status != null) p.setStatus(status);
        if (startDate != null && !startDate.isEmpty()) p.setStartDate(java.time.LocalDate.parse(startDate));
        if (endDate != null && !endDate.isEmpty()) p.setEndDate(java.time.LocalDate.parse(endDate));
        return mapToDTO(projectRepository.save(p));
    }

    @Transactional
    public void deleteProject(Long projectId) {
        projectRepository.deleteById(projectId);
    }

    @Transactional
    public void addMemberToProject(Long projectId, Long userId) {
        Project p = projectRepository.findById(projectId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        boolean exists = projectMemberRepository.findByUserId(userId).stream()
            .anyMatch(pm -> pm.getProject().getId().equals(projectId));
        if (!exists) {
            ProjectMember member = new ProjectMember();
            member.setProject(p);
            member.setUser(user);
            projectMemberRepository.save(member);
            
            notificationService.createNotification(
                user,
                "Added to Project",
                "You have been added to project: " + p.getName()
            );
        }
    }

    @Transactional
    public void removeMemberFromProject(Long projectId, Long userId, String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername).orElseThrow();
        projectMemberRepository.findByUserId(userId).stream()
            .filter(pm -> pm.getProject().getId().equals(projectId))
            .findFirst()
            .ifPresent(pm -> {
                if ("PROJECT_MANAGER".equals(currentUser.getRole().getName().name()) && "ADMIN".equals(pm.getUser().getRole().getName().name())) {
                    throw new RuntimeException("Project Managers cannot remove Admins from projects.");
                }
                projectMemberRepository.delete(pm);
                notificationService.createNotification(
                    pm.getUser(),
                    "Removed from Project",
                    "You have been removed from project: " + pm.getProject().getName()
                );
            });
    }

    private ProjectDTO mapToDTO(Project p) {
        ProjectDTO dto = new ProjectDTO();
        dto.setId(p.getId());
        dto.setWorkspaceId(p.getWorkspace().getId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setStartDate(p.getStartDate());
        dto.setEndDate(p.getEndDate());
        dto.setStatus(p.getStatus());
        dto.setCreatedAt(p.getCreatedAt());

        UserDTO creator = new UserDTO();
        creator.setId(p.getCreatedBy().getId());
        creator.setUsername(p.getCreatedBy().getUsername());
        creator.setEmail(p.getCreatedBy().getEmail());
        creator.setRole(p.getCreatedBy().getRole().getName().name());
        dto.setCreatedBy(creator);
        
        List<UserDTO> members = projectMemberRepository.findByProjectId(p.getId())
            .stream()
            .map(pm -> {
                UserDTO m = new UserDTO();
                m.setId(pm.getUser().getId());
                m.setUsername(pm.getUser().getUsername());
                m.setEmail(pm.getUser().getEmail());
                m.setRole(pm.getUser().getRole().getName().name());
                return m;
            })
            .collect(Collectors.toList());
        dto.setMembers(members);

        return dto;
    }
}
